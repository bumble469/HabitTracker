// @vitest-environment jsdom
import { StrictMode, act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import usePredictions, { predictionPayload } from './usePredictions';
import { setAiPreference } from '../services/predictionApi';

const today = '2026-11-22';
const habits = Array.from({ length: 5 }, (_, index) => ({
  id: `h${index}`,
  name: `Habit ${index}`,
  createdAt: '2026-11-01T12:00:00Z',
}));
const valid = {
  probability: 0.72,
  level: 'high',
  reason: 'Backend explanation',
};
const response = (data) => ({ ok: true, json: async () => data });
let container;
let root;
let snapshot;
let pending;
function Harness(props) {
  snapshot = usePredictions(props);
  return <div>{snapshot.loading ? 'loading' : 'ready'}</div>;
}
async function render(props) {
  await act(async () => {
    root.render(
      <StrictMode>
        <Harness
          habits={habits}
          completions={{}}
          today={today}
          enabled
          {...props}
        />
      </StrictMode>
    );
  });
}
async function settle(index, data = valid) {
  await act(async () => {
    pending[index].resolve(response(data));
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  setAiPreference(true);
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
  pending = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url, options) =>
        new Promise((resolve) => {
          pending.push({ resolve, url, options });
        })
    )
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
    setAiPreference(false);
  });
  container.remove();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('prediction payload', () => {
  it('uses actual IDs, local creation dates, and unique non-future completion dates', () => {
    expect(
      predictionPayload(
        { id: 'local', created_on: '2026-11-01' },
        { local: ['2026-11-21', '2026-11-21', '2026-12-01', '2026-10-30'] },
        today
      )
    ).toEqual({
      habit_id: 'local',
      created_on: '2026-11-01',
      today,
      completed_dates: ['2026-11-21'],
    });
  });
  it('converts creation timestamps using local calendar fields', () => {
    const date = new Date('2026-11-01T23:30:00-08:00');
    const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    expect(
      predictionPayload({ id: 'x', createdAt: date.toISOString() }, {}, today)
        .created_on
    ).toBe(local);
  });
  it('does not fabricate a creation date for legacy or invalid records', () => {
    expect(predictionPayload({ id: 'x' }, {}, today).created_on).toBeNull();
    expect(
      predictionPayload({ id: 'x', createdAt: '2026-02-30' }, {}, today)
        .created_on
    ).toBeNull();
  });
});

describe('prediction lifecycle', () => {
  it('bounds concurrency to three and avoids duplicate StrictMode or equivalent-rerender calls', async () => {
    await render();
    expect(fetch).toHaveBeenCalledTimes(3);
    await render({
      habits: habits.map((habit) => ({ ...habit })),
      completions: {},
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    await settle(0);
    expect(fetch).toHaveBeenCalledTimes(4);
    await settle(1);
    expect(fetch).toHaveBeenCalledTimes(5);
    await settle(2);
    await settle(3);
    await settle(4);
    expect(snapshot.loading).toBe(false);
    expect(Object.keys(snapshot.results)).toHaveLength(5);
    expect(snapshot.results.h0).toEqual(valid);
  });
  it('cancels deleted/edited histories and prevents late results from reappearing', async () => {
    await render({ habits: habits.slice(0, 1) });
    const oldSignal = pending[0].options.signal;
    await render({
      habits: [{ ...habits[0], name: 'Edited' }],
      completions: { h0: [today] },
    });
    expect(oldSignal.aborted).toBe(true);
    expect(snapshot.results).toEqual({});
    await settle(0, { ...valid, probability: 0.99 });
    expect(snapshot.results).toEqual({});
    await settle(1, { ...valid, probability: 0.1 });
    expect(snapshot.results.h0.probability).toBe(0.1);
    await render({ habits: [] });
    expect(snapshot.results).toEqual({});
    expect(snapshot.loading).toBe(false);
  });
  it('invalidates replacement/import revisions even if the payload is unchanged', async () => {
    await render({ habits: habits.slice(0, 1), revision: 0 });
    await settle(0);
    await render({ habits: habits.slice(0, 1), revision: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(snapshot.results).toEqual({});
  });
  it('refreshes on a local date change and aborts work away from requesting routes', async () => {
    await render({ habits: habits.slice(0, 1) });
    await render({ habits: habits.slice(0, 1), today: '2026-11-23' });
    expect(pending[0].options.signal.aborted).toBe(true);
    expect(JSON.parse(pending[1].options.body).today).toBe('2026-11-23');
    await render({ habits: habits.slice(0, 1), active: false });
    expect(pending[1].options.signal.aborted).toBe(true);
    expect(snapshot.loading).toBe(false);
  });
  it('switching off stops queued calls, aborts active work, and blocks retries', async () => {
    await render();
    expect(fetch).toHaveBeenCalledTimes(3);
    await act(async () => {
      setAiPreference(false);
    });
    await render({ enabled: false });
    pending
      .slice(0, 3)
      .forEach((item) => expect(item.options.signal.aborted).toBe(true));
    await settle(0);
    await act(async () => {
      snapshot.retry();
    });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(snapshot.results).toEqual({});
  });
  it('keeps successful habits usable when another prediction fails', async () => {
    await render({ habits: habits.slice(0, 2) });
    await settle(0);
    await settle(1, { probability: 99 });
    expect(snapshot.results.h0).toEqual(valid);
    expect(snapshot.results.h1).toMatchObject({ unavailable: true });
    expect(snapshot.loading).toBe(false);
    expect(snapshot.error).toContain('unavailable');
    await act(async () => {
      snapshot.retry();
    });
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('makes no requests with AI off even if the hook is mistakenly enabled', async () => {
    setAiPreference(false);
    await render();
    expect(fetch).not.toHaveBeenCalled();
    expect(snapshot.loading).toBe(false);
    expect(snapshot.results.h0).toMatchObject({ unavailable: true });
  });
  it('provides terminal unavailable results rather than endless loading without API configuration', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    await render();
    expect(fetch).not.toHaveBeenCalled();
    expect(snapshot.loading).toBe(false);
    expect(snapshot.configured).toBe(false);
    expect(snapshot.error).toBe('The prediction service is not configured.');
    for (const habit of habits)
      expect(snapshot.results[habit.id]).toEqual({
        unavailable: true,
        reason: snapshot.error,
      });
    await act(async () => {
      snapshot.retry();
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(snapshot.loading).toBe(false);
  });
  it('re-enabling AI starts fresh without showing results from before opt-out', async () => {
    await render({ habits: habits.slice(0, 1) });
    await settle(0, { ...valid, probability: 0.99 });
    expect(snapshot.results.h0.probability).toBe(0.99);
    setAiPreference(false);
    await render({ habits: habits.slice(0, 1), enabled: false });
    expect(snapshot.results).toEqual({});
    setAiPreference(true);
    await render({ habits: habits.slice(0, 1), enabled: true });
    expect(snapshot.results).toEqual({});
    expect(snapshot.loading).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    await settle(1, { ...valid, probability: 0.1 });
    expect(snapshot.results.h0.probability).toBe(0.1);
  });
  it('shows an unavailable result without sending fabricated creation data', async () => {
    await render({ habits: [{ id: 'legacy', name: 'Legacy habit' }] });
    expect(fetch).not.toHaveBeenCalled();
    expect(snapshot.results.legacy).toMatchObject({ unavailable: true });
    expect(snapshot.results.legacy.reason).toContain('creation date');
  });
});

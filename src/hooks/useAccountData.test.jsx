// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useAccountData from './useAccountData';
import { setSessionToken } from '../services/api';

let root, container, data;
let habits, completions;
const user = { id: 'account-a', timezone: 'Asia/Kolkata' };
const active = {
  id: 'habit-a',
  name: 'Read',
  description: '',
  created_on: '2026-10-01',
  archived_at: null,
  is_demo: false,
};
const archived = {
  ...active,
  id: 'archived',
  archived_at: '2026-11-23T12:00:00',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status });
function Harness(props) {
  data = useAccountData(props.user, props.today);
  return (
    <div>
      {data.status}:{data.habits.length}
    </div>
  );
}
const render = async (props = {}) =>
  act(async () =>
    root.render(<Harness user={user} today="2026-11-24" {...props} />)
  );
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  habits = [active, archived];
  completions = { 'habit-a': ['2026-11-23'] };
  setSessionToken('token');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      if (url.endsWith('/api/habits?include_archived=true'))
        return json(habits);
      if (url.endsWith('/api/completions')) return json(completions);
      throw new Error(`Unexpected ${url}`);
    })
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  setSessionToken(null);
  vi.unstubAllGlobals();
});

describe('account data reconciliation', () => {
  it('uses one coherent server snapshot and filters archive records locally', async () => {
    await render();
    expect(data.status).toBe('success');
    expect(data.allHabits).toEqual([active, archived]);
    expect(data.habits).toEqual([active]);
    expect(data.completions).toEqual(completions);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('keeps initial failure distinct from an empty account and retries', async () => {
    fetch.mockResolvedValueOnce(json({ detail: 'Database unavailable' }, 503));
    await render();
    expect(data.status).toBe('error');
    expect(data.error).toBe('Database unavailable');
    habits = [];
    completions = {};
    await act(async () => data.refresh());
    expect(data.status).toBe('success');
    expect(data.error).toBe('');
    expect(data.habits).toEqual([]);
  });
  it('locks rapid check-ins synchronously, parses 204, and refreshes aggregate completions', async () => {
    await render();
    let finish;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    let first;
    await act(async () => {
      first = data.toggleCompletion('habit-a', '2026-11-24');
      await data.toggleCompletion('habit-a', '2026-11-24');
    });
    expect(data.pendingKeys.has('completion:habit-a:2026-11-24')).toBe(true);
    expect(
      fetch.mock.calls.filter(([url]) =>
        url.includes('/completions/2026-11-24')
      )
    ).toHaveLength(1);
    completions = { 'habit-a': ['2026-11-23', '2026-11-24'] };
    await act(async () => {
      finish(new Response(null, { status: 204 }));
      await first;
    });
    expect(data.completions['habit-a']).toContain('2026-11-24');
    expect(data.pendingKeys.size).toBe(0);
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    completions = { 'habit-a': ['2026-11-23'] };
    await act(async () => data.toggleCompletion('habit-a', '2026-11-24'));
    expect(
      fetch.mock.calls.findLast(([url]) =>
        url.includes('/completions/2026-11-24')
      )[1].method
    ).toBe('DELETE');
    expect(data.completions['habit-a']).not.toContain('2026-11-24');
  });
  it('retains confirmed completion state on mutation failure', async () => {
    await render();
    fetch.mockResolvedValueOnce(
      json({ detail: 'Cannot check in for a future date' }, 422)
    );
    await act(async () => {
      await expect(
        data.toggleCompletion('habit-a', '2026-12-30')
      ).rejects.toMatchObject({ status: 422 });
    });
    expect(data.completions).toEqual({ 'habit-a': ['2026-11-23'] });
    expect(data.mutationError).toContain('future date');
    expect(data.pendingKeys.size).toBe(0);
  });
  it('uses exact archive/restore/permanent-delete, import and demo requests without generated ids', async () => {
    await render();
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await act(async () => data.archiveHabit('habit-a'));
    expect(fetch.mock.calls[2][0]).toContain('/api/habits/habit-a');
    expect(fetch.mock.calls[2][1].method).toBe('DELETE');
    fetch.mockResolvedValueOnce(json(active));
    await act(async () => data.restoreHabit('habit-a'));
    expect(fetch.mock.calls[5][0]).toContain('/api/habits/habit-a/restore');
    expect(fetch.mock.calls[5][1]).not.toHaveProperty('body');
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await act(async () => data.deleteHabit('archived'));
    expect(fetch.mock.calls[8][0]).toContain(
      '/api/habits/archived?permanent=true'
    );
    const imported = [
      {
        name: 'Read',
        description: '',
        created_on: '2026-10-01',
        completed_dates: ['2026-11-23'],
      },
    ];
    fetch.mockResolvedValueOnce(
      json({ habits_created: 1, completions_created: 1 }, 201)
    );
    await act(async () => data.importHabits(imported));
    expect(JSON.parse(fetch.mock.calls[11][1].body)).toEqual({
      habits: imported,
    });
    habits = [active, { ...archived, is_demo: true }];
    fetch.mockResolvedValueOnce(
      json({ detail: 'Demo data is already loaded' }, 409)
    );
    await act(async () => {
      await expect(data.loadDemo()).rejects.toMatchObject({ status: 409 });
    });
    expect(data.mutationError).toBe('Demo data is already loaded');
    expect(
      data.allHabits.some(
        (habit) => habit.is_demo && habit.archived_at !== null
      )
    ).toBe(true);
    fetch.mockResolvedValueOnce(json({ habits_removed: 4 }));
    let removed;
    await act(async () => {
      removed = await data.removeDemo();
    });
    expect(removed).toEqual({ habits_removed: 4 });
  });
  it('distinguishes a confirmed mutation from failed reload and prevents stale-state writes', async () => {
    await render();
    fetch.mockResolvedValueOnce(json({ ...active, name: 'Saved name' }));
    fetch.mockRejectedValueOnce(new TypeError('network down'));
    await act(async () =>
      data.editHabit('habit-a', { name: 'Saved name', description: '' })
    );
    expect(data.status).toBe('success');
    expect(data.mutationError).toContain('backend saved this change');
    await act(async () => {
      await expect(
        data.toggleCompletion('habit-a', '2026-11-24')
      ).rejects.toThrow('Reload account data');
    });
    await act(async () => data.refresh());
    expect(data.error).toBe('');
  });
  it('refreshes when account timezone or local day changes and clears old account data', async () => {
    await render();
    await render({ user: { ...user, timezone: 'UTC' } });
    expect(fetch).toHaveBeenCalledTimes(4);
    await render({ user: { ...user, timezone: 'UTC' }, today: '2026-11-25' });
    expect(fetch).toHaveBeenCalledTimes(6);
    let finish;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await render({ user: { id: 'account-b', timezone: 'UTC' } });
    expect(data.status).toBe('loading');
    expect(data.habits).toEqual([]);
    expect(data.completions).toEqual({});
    habits = [];
    await act(async () => finish(json([])));
    expect(data.habits).toEqual([]);
  });
});

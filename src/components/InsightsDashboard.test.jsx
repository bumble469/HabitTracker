// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InsightsDashboard from './InsightsDashboard';
import { daysBetween } from '../utils/insights';

// Keep the real Recharts components; supply deterministic dimensions because
// jsdom does not measure responsive containers.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  const { cloneElement } = await import('react');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) =>
      cloneElement(children, { width: 640, height: 300 }),
  };
});

const today = '2026-11-18';
const habits = [{ id: 'read', name: 'Read', createdAt: '2026-07-01' }];
const completions = { read: daysBetween('2026-11-05', today) };
const valid = {
  probability: 0.72,
  level: 'high',
  reason: 'The backend explanation',
};
let container;
let root;

async function render(props = {}) {
  await act(async () =>
    root.render(
      <InsightsDashboard
        habits={habits}
        completions={completions}
        today={today}
        predictions={{ read: valid }}
        aiEnabled
        predictionLoading={false}
        onRetryPredictions={vi.fn()}
        {...props}
      />
    )
  );
}
const weeklyTable = () => container.querySelector('.chart-panel table');

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('Insights report interactions', () => {
  it('labels the selector and changes actual chart periods while tomorrow risk and drop-off stay fixed', async () => {
    await render();
    const select = container.querySelector('select');
    expect(select.labels).toHaveLength(1);
    expect(select.labels[0].textContent).toBe('Reporting period');
    expect(select.value).toBe('8');
    expect(weeklyTable().querySelectorAll('tbody tr')).toHaveLength(8);
    expect(weeklyTable().querySelector('tbody th').textContent).toContain(
      'Sep 28, 2026'
    );
    const tomorrow = container.querySelector('.insights-risk').textContent;
    expect(tomorrow).toContain('For Nov 19, 2026');
    expect(tomorrow).toContain('72%');
    const fixedDropOff = container.querySelector('.drop-off-panel').textContent;
    expect(fixedDropOff).toContain('+100 percentage points');

    for (const [weeks, start] of [
      [4, 'Oct 26, 2026'],
      [12, 'Aug 31, 2026'],
    ]) {
      await act(async () => {
        select.value = String(weeks);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(weeklyTable().querySelectorAll('tbody tr')).toHaveLength(weeks);
      expect(weeklyTable().querySelector('tbody th').textContent).toContain(
        start
      );
      expect(container.querySelector('.report-period').textContent).toContain(
        start
      );
      expect(container.querySelector('.insights-risk').textContent).toBe(
        tomorrow
      );
      expect(container.querySelector('.drop-off-panel').textContent).toBe(
        fixedDropOff
      );
    }
    expect(
      [...weeklyTable().querySelectorAll('tbody th')].at(-1).textContent
    ).toBe('Nov 16, 2026 – Nov 18, 2026 (partial)');
  });

  it('keeps local charts and accessible data available with AI off and zero completions', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await render({ aiEnabled: false, predictions: {}, completions: {} });
    expect(fetch).not.toHaveBeenCalled();
    expect(container.querySelector('.insights-risk').textContent).toContain(
      'AI disabled'
    );
    expect(container.querySelector('.risk-table')).toBeNull();
    expect(container.querySelectorAll('.chart-data table')).toHaveLength(2);
    expect(weeklyTable().caption.textContent).toContain('Weekly consistency');
    expect(weeklyTable().querySelectorAll('tbody tr')).toHaveLength(8);
    const first = [
      ...weeklyTable().querySelector('tbody tr').querySelectorAll('td'),
    ].map((cell) => cell.textContent);
    expect(first).toEqual(['0', '7', '0%']);
    expect(container.querySelector('.drop-off-panel').textContent).toContain(
      'Unchanged'
    );
    const details = container.querySelector('.chart-data');
    await act(async () => details.querySelector('summary').click());
    expect(details.open).toBe(true);
  });

  it('separates unavailable habits from valid rankings and exposes the failure reason by disclosure', async () => {
    const unavailable = {
      unavailable: true,
      reason:
        'The prediction request timed out. Retry when the backend is available.',
    };
    await render({
      habits: [
        ...habits,
        { id: 'walk', name: 'Walk', createdAt: '2026-07-01' },
      ],
      predictions: { read: valid, walk: unavailable },
    });
    const ranked = container.querySelectorAll('.risk-table tbody tr');
    expect(ranked).toHaveLength(1);
    expect(ranked[0].textContent).toContain('Read');
    expect(ranked[0].textContent).toContain(valid.reason);
    const unranked = container.querySelector('.unranked-row');
    expect(unranked.textContent).toContain('Walk');
    expect(unranked.querySelector('summary').textContent).toContain(
      'AI unavailable'
    );
    await act(async () => unranked.querySelector('summary').click());
    expect(unranked.querySelector('details').open).toBe(true);
    expect(unranked.querySelector('.risk-reason').textContent).toContain(
      unavailable.reason
    );
    expect(unranked.textContent).not.toContain('low risk');
  });
});

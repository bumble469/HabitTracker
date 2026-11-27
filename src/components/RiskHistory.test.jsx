// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../services/predictionApi', () => ({
  getRiskHistory: vi.fn(),
  riskErrorMessage: (error) => error.message,
}));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  CartesianGrid: () => null,
  Line: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
import { getRiskHistory } from '../services/predictionApi';
import RiskHistory from './RiskHistory';
import RiskBadge from './RiskBadge';
let root, container;
const habit = {
  id: 'archived-opaque',
  name: 'Read',
  archived_at: '2026-11-24T08:00:00',
  is_demo: true,
};
const points = [
  { as_of: '2026-11-01', risk: 0, level: 'low', reasons: [] },
  {
    as_of: '2026-11-05',
    risk: null,
    level: 'not_enough_data',
    reasons: ['Too new'],
  },
  {
    as_of: '2026-11-20',
    risk: 0.499,
    level: 'high',
    reasons: ['Server explanation'],
  },
];
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  getRiskHistory.mockResolvedValue(points);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllMocks();
});
async function render(props = {}) {
  await act(async () =>
    root.render(<RiskHistory habit={habit} enabled {...props} />)
  );
}

describe('saved risk snapshots', () => {
  it('reads archived habit history only, preserving sparse dates, zero and null', async () => {
    await render();
    expect(getRiskHistory).toHaveBeenCalledWith(
      habit.id,
      expect.any(AbortSignal)
    );
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(container.textContent).toContain('0%');
    expect(container.textContent).toContain('Unavailable');
    expect(container.textContent).toContain('50%high');
    expect(container.textContent).toContain('Demo');
  });
  it('waits for current computation before refreshing history and blocks AI-disabled reads', async () => {
    await render({ loading: true });
    expect(getRiskHistory).not.toHaveBeenCalled();
    await render({ loading: false, revision: 1 });
    expect(getRiskHistory).toHaveBeenCalledTimes(1);
    await render({ enabled: false, revision: 2 });
    expect(getRiskHistory).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('AI is disabled');
    expect(container.querySelector('tbody')).toBeNull();
    await render({ enabled: true, revision: 2 });
    expect(getRiskHistory).toHaveBeenCalledTimes(2);
  });
  it('distinguishes a failed read from empty history and provides deliberate retry', async () => {
    getRiskHistory.mockRejectedValueOnce(new Error('Model not installed'));
    await render();
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      'Model not installed'
    );
    expect(container.textContent).not.toContain('No recorded predictions yet');
    getRiskHistory.mockResolvedValueOnce([]);
    await act(async () => container.querySelector('button').click());
    expect(container.textContent).toContain('No recorded predictions yet');
  });
});

it('shows the exact backend risk level despite percentage rounding and explains unavailable data', async () => {
  await act(async () =>
    root.render(
      <RiskBadge prediction={{ ...points[2], habit_id: 'h1' }} aiEnabled />
    )
  );
  expect(container.querySelector('summary').textContent).toContain('50%');
  expect(container.querySelector('summary').textContent).toContain('high risk');
  expect(container.textContent).toContain(
    'Based on activity through 2026-11-20'
  );
  await act(async () =>
    root.render(
      <RiskBadge prediction={{ ...points[1], habit_id: 'h1' }} aiEnabled />
    )
  );
  expect(container.textContent).toContain('14 calendar days');
  expect(container.textContent).not.toContain('0%');
});

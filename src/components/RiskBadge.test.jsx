// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it } from 'vitest';
import RiskBadge from './RiskBadge';

let root;
let container;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const render = async (prediction, props = {}) =>
  act(async () => root.render(<RiskBadge prediction={prediction} aiEnabled {...props} />));

it('displays normalized scores, including zero, and retains the supplied level', async () => {
  await render({ probability: 0.499, level: 'high', reason: 'Recent missed days' });
  expect(container.querySelector('summary').textContent).toContain('50%');
  expect(container.querySelector('summary').textContent).toContain('high risk');
  expect(container.textContent).toContain('Recent missed days');
  await render({ probability: 0, level: 'low', reason: 'Consistent check-ins' });
  expect(container.querySelector('summary').textContent).toContain('0%');
});

it('supports saved snapshots and keeps their reasons and history date', async () => {
  await render({ risk: 0.499, level: 'high', reasons: ['Missed days', 'Short streak'], as_of: '2026-11-20' });
  expect(container.querySelector('summary').textContent).toContain('50%');
  expect(container.textContent).toContain('Missed days; Short streak');
  expect(container.textContent).toContain('Based on activity through 2026-11-20');
});

it.each([undefined, null, NaN, Infinity, -1, 2])('shows unavailable instead of a numeric score for %s', async (probability) => {
  await render({ probability, level: 'high' });
  expect(container.querySelector('summary').textContent).toContain('AI unavailable');
  expect(container.textContent).not.toMatch(/NaN|Infinity|0%/);
});

it('explains insufficient history for both prediction formats', async () => {
  await render({ unavailable: true, level: 'not_enough_data', reason: 'This habit is new' });
  expect(container.textContent).toContain('14 calendar days');
  expect(container.textContent).toContain('This habit is new');
  expect(container.textContent).not.toContain('AI unavailable');
  await render({ risk: null, level: 'not_enough_data', reasons: ['Keep checking in'] });
  expect(container.textContent).toContain('Keep checking in');
  expect(container.textContent).not.toContain('%');
});

it('preserves unsupported schedule, explicit unavailable, and disabled states', async () => {
  await render({ level: 'unsupported_schedule', reason: 'Only daily habits are supported' });
  expect(container.textContent).toContain('Not scored for schedule');
  expect(container.textContent).toContain('Only daily habits are supported');
  await render({ unavailable: true, reason: 'Service could not be reached' });
  expect(container.textContent).toContain('Service could not be reached');
  await render({ probability: 0.7, level: 'high' }, { aiEnabled: false });
  expect(container.textContent).toBe('AI disabled');
});

// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useLocalDate from './useLocalDate';
let root, container;
function Clock({ timezone }) {
  const today = useLocalDate(timezone);
  return <p>{today}</p>;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-24T00:30:00Z'));
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});
it('changes displayed day when account timezone changes and falls back to UTC consistently', async () => {
  await act(async () => root.render(<Clock timezone="America/Los_Angeles" />));
  expect(container.textContent).toBe('2026-11-23');
  await act(async () => root.render(<Clock timezone="Asia/Kolkata" />));
  expect(container.textContent).toBe('2026-11-24');
  await act(async () => root.render(<Clock timezone="Invalid/Timezone" />));
  expect(container.textContent).toBe('2026-11-24');
});
it('refreshes on focus after account midnight and on the running date timer', async () => {
  vi.setSystemTime(new Date('2026-11-23T18:29:50Z'));
  await act(async () => root.render(<Clock timezone="Asia/Kolkata" />));
  expect(container.textContent).toBe('2026-11-23');
  vi.setSystemTime(new Date('2026-11-23T18:30:01Z'));
  await act(async () => window.dispatchEvent(new Event('focus')));
  expect(container.textContent).toBe('2026-11-24');
  vi.setSystemTime(new Date('2026-11-24T18:29:50Z'));
  await act(async () => vi.advanceTimersByTimeAsync(30_000));
  expect(container.textContent).toBe('2026-11-25');
});

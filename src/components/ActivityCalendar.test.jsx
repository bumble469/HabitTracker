// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ActivityCalendar from './ActivityCalendar';

let root;
let container;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
const habits = [
  { id: 'read', name: 'Read', createdAt: '2025-01-01T09:00:00' },
  { id: 'walk', name: 'Walk', createdAt: '2025-01-01T09:00:00' },
];

describe('activity calendar interactions', () => {
  it('renders count-based intensity and leaves empty days neutral', async () => {
    await act(async () => root.render(<ActivityCalendar habits={habits} completions={{ read: ['2026-11-26'], walk: ['2026-11-26', '2026-11-27'] }} today="2026-11-27" />));
    expect(container.querySelector('[data-date="2026-11-26"]').classList.contains('activity-level-2')).toBe(true);
    expect(container.querySelector('[data-date="2026-11-25"]').classList.contains('activity-level-0')).toBe(true);
    expect(container.querySelector('[data-date="2026-11-28"]').disabled).toBe(true);
    expect(container.querySelectorAll('.activity-weeks button[tabindex="0"]')).toHaveLength(1);
    const yesterday = container.querySelector('[data-date="2026-11-26"]');
    await act(async () => yesterday.click());
    expect(container.querySelector('.activity-day-detail').textContent).toContain('2 check-ins');
    expect(container.querySelector('.activity-day-detail').textContent).toContain('Read · Walk');
  });

  it('supports arrow-key exploration and clamps navigation to recorded calendar bounds', async () => {
    await act(async () => root.render(<ActivityCalendar habits={[]} completions={{}} today="2026-11-27" />));
    const today = container.querySelector('[data-date="2026-11-27"]');
    today.focus();
    await act(async () => today.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })));
    expect(document.activeElement.dataset.date).toBe('2026-11-26');
    expect(container.querySelector('.activity-day-detail').textContent).toContain('November 26, 2026');
    await act(async () => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement.dataset.date).toBe('2026-11-26');
  });

  it('changes years while keeping all-time streaks and updating year-scoped totals', async () => {
    await act(async () => root.render(<ActivityCalendar habits={habits} completions={{ read: ['2025-12-31', '2026-01-01'], walk: ['2026-01-01'] }} today="2026-01-01" />));
    const selector = container.querySelector('select');
    expect(container.querySelector('.activity-metrics').textContent).toContain('2Check-ins in 2026');
    await act(async () => {
      selector.value = '2025';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.querySelector('.activity-metrics').textContent).toContain('1Check-ins in 2025');
    expect(container.querySelector('.activity-day-detail').textContent).toContain('December 31, 2025');
    expect(container.querySelectorAll('.activity-weeks button')).toHaveLength(365);
    expect(container.querySelectorAll('.activity-weeks button[tabindex="0"]')).toHaveLength(1);
  });
});

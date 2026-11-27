// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import CalendarView from './CalendarView';

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

describe('calendar month and history interactions', () => {
  it('navigates from the 31st to the previous month without skipping a month', async () => {
    await act(async () =>
      root.render(
        <CalendarView habits={[]} completions={{}} today="2026-03-31" />
      )
    );
    expect(container.querySelector('[aria-current="date"]').textContent).toBe(
      '31'
    );
    expect(container.querySelector('[aria-label="Next month"]').disabled).toBe(
      true
    );
    await act(async () =>
      container.querySelector('[aria-label="Previous month"]').click()
    );
    expect(container.querySelector('.calendar-heading h2').textContent).toBe(
      'February 2026'
    );
    expect(container.querySelectorAll('.calendar-day')).toHaveLength(28);
    await act(async () =>
      [...container.querySelectorAll('button')]
        .find((button) => button.textContent === 'Today')
        .click()
    );
    expect(container.querySelector('.calendar-heading h2').textContent).toBe(
      'March 2026'
    );
    expect(container.querySelector('[aria-pressed="true"]').textContent).toBe(
      '31'
    );
  });
  it('selects actual local dates and counts only scheduled habits created by that date', async () => {
    const habits = [
      {
        id: 'h1',
        name: 'Monday habit',
        createdAt: '2026-11-01T00:00:00',
        scheduledDays: [1],
      },
      { id: 'h2', name: 'Future habit', createdAt: '2026-11-10T00:00:00' },
    ];
    await act(async () =>
      root.render(
        <CalendarView
          habits={habits}
          completions={{ h1: ['2026-11-02'], h2: [] }}
          today="2026-11-03"
        />
      )
    );
    const monday = container.querySelector(
      'button[aria-label^="November 2, 2026"]'
    );
    expect(monday.getAttribute('aria-label')).toContain('1 of 1 completed');
    await act(async () => monday.click());
    expect(container.querySelector('.calendar-details').textContent).toContain(
      'Monday habit'
    );
    expect(
      container.querySelector('.calendar-details').textContent
    ).not.toContain('Future habit');
    expect(
      container.querySelector('button[aria-label^="November 4, 2026"]').disabled
    ).toBe(true);
  });
});

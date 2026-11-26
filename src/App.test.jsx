// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { toDateKey } from './utils/insights';

// jsdom has no layout engine. Keep the report components and their accessible
// data alternatives real while omitting only Recharts' measured SVG surfaces.
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal()),
  ResponsiveContainer: () => null,
}));

let root;
let container;
let fetchMock;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const seedHabit = {
  id: 'existing',
  name: 'Existing habit',
  description: 'Keep this history',
  createdAt: '2026-09-01T09:00:00',
};
const activeDialog = () => container.querySelector('dialog[open]');
const namedButton = (name, scope = container) =>
  [...scope.querySelectorAll('button')].find(
    (button) => button.textContent.trim() === name
  );
const clickButton = async (name, scope = container) => {
  const target = namedButton(name, scope);
  expect(target, `button ${name}`).toBeTruthy();
  await act(async () => target.click());
};
const navigate = async (label) =>
  clickButton(label, container.querySelector('.sidebar nav'));
const setField = async (labelText, value) => {
  const scope = activeDialog();
  const label = [...scope.querySelectorAll('label')].find((element) =>
    element.textContent.startsWith(labelText)
  );
  const field = document.getElementById(label.htmlFor);
  const prototype =
    field.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const submit = async () =>
  act(async () =>
    activeDialog()
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );
const mount = async () => act(async () => root.render(<App />));
const reload = async () => {
  await act(async () => root.unmount());
  root = createRoot(container);
  await mount();
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-22T12:00:00+05:30'));
  vi.stubEnv('VITE_API_BASE_URL', 'https://backend.example.test');
  fetchMock = vi.fn().mockRejectedValue(new TypeError('Backend offline'));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    callback();
    return 1;
  });
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('offline App workflows', () => {
  it('creates, checks in, edits, reloads, and confirms deletion without a backend', async () => {
    await mount();
    await clickButton('Add habit');
    await submit();
    expect(activeDialog().textContent).toContain('Enter a habit name.');
    await setField('Habit name', 'Read for 20 minutes');
    await setField('Description', 'Before bed');
    await submit();
    let storedHabits = JSON.parse(localStorage.getItem('habits'));
    expect(storedHabits).toHaveLength(1);
    expect(storedHabits[0].name).toBe('Read for 20 minutes');
    const id = storedHabits[0].id;
    const today = toDateKey();
    await act(async () =>
      container
        .querySelector('[aria-label="Complete: Read for 20 minutes"]')
        .click()
    );
    expect(JSON.parse(localStorage.getItem('completions'))[id]).toEqual([
      today,
    ]);
    expect(
      container.querySelector('.habit-check').getAttribute('aria-pressed')
    ).toBe('true');
    await act(async () =>
      container.querySelector('.actions-menu summary').click()
    );
    await clickButton('Edit habit', container.querySelector('.actions-menu'));
    await setField('Habit name', 'Read before bed');
    await clickButton('Save changes', activeDialog());
    storedHabits = JSON.parse(localStorage.getItem('habits'));
    expect(storedHabits[0].name).toBe('Read before bed');
    expect(JSON.parse(localStorage.getItem('completions'))[id]).toEqual([
      today,
    ]);
    await reload();
    expect(container.querySelector('.habit-row h3').textContent).toBe(
      'Read before bed'
    );
    expect(
      container.querySelector('.habit-check').getAttribute('aria-pressed')
    ).toBe('true');
    await act(async () =>
      container.querySelector('.actions-menu summary').click()
    );
    await clickButton('Delete habit', container.querySelector('.actions-menu'));
    await clickButton('Cancel', activeDialog());
    expect(JSON.parse(localStorage.getItem('habits'))).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('completions'))[id]).toEqual([
      today,
    ]);
    await act(async () =>
      container.querySelector('.actions-menu summary').click()
    );
    await clickButton('Delete habit', container.querySelector('.actions-menu'));
    await clickButton('Delete habit', activeDialog());
    expect(JSON.parse(localStorage.getItem('habits'))).toEqual([]);
    expect(JSON.parse(localStorage.getItem('completions'))).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps every existing tab usable and sends no requests with persisted AI off, including after reload', async () => {
    localStorage.setItem('habits', JSON.stringify([seedHabit]));
    localStorage.setItem(
      'completions',
      JSON.stringify({ existing: ['2026-11-21'] })
    );
    localStorage.setItem('aiEnabled', 'false');
    await mount();
    for (const [label, heading] of [
      ['Habits', 'Your habits'],
      ['Calendar', 'Calendar'],
      ['Statistics', 'Statistics'],
      ['Insights', 'Insights'],
      ['Data', 'Data'],
      ['Settings', 'Settings'],
      ['Dashboard', 'Today'],
    ]) {
      await navigate(label);
      expect(container.querySelector('h1').textContent).toBe(heading);
    }
    await navigate('Insights');
    expect(container.textContent).toContain('Weekly consistency');
    expect(container.textContent).toContain('Drop-off summary');
    await reload();
    expect(container.querySelector('h1').textContent).toBe('Today');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem('aiEnabled')).toBe('false');
  });

  it('cancels habit creation without storing a partial habit', async () => {
    await mount();
    await clickButton('Add habit');
    await setField('Habit name', 'Unsaved habit');
    await clickButton('Cancel', activeDialog());
    expect(localStorage.getItem('habits')).toBeNull();
    expect(container.querySelectorAll('.habit-row')).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'replaces actual App data with a confirmed demo while preserving AI preference %s',
    async (aiEnabled) => {
      localStorage.setItem('habits', JSON.stringify([seedHabit]));
      localStorage.setItem(
        'completions',
        JSON.stringify({ existing: ['2026-11-21'] })
      );
      localStorage.setItem('aiEnabled', JSON.stringify(aiEnabled));
      await mount();
      await navigate('Settings');
      const before = localStorage.getItem('habits');
      await clickButton('Load demo data');
      expect(localStorage.getItem('habits')).toBe(before);
      await clickButton('Cancel', activeDialog());
      expect(localStorage.getItem('habits')).toBe(before);
      await clickButton('Load demo data');
      await clickButton('Replace with demo data', activeDialog());
      const demoHabits = JSON.parse(localStorage.getItem('habits'));
      expect(demoHabits).toHaveLength(6);
      expect(demoHabits.every((habit) => habit.source === 'demo')).toBe(true);
      expect(
        JSON.parse(localStorage.getItem('completions'))
      ).not.toHaveProperty('existing');
      expect(localStorage.getItem('aiEnabled')).toBe(JSON.stringify(aiEnabled));
      await navigate('Dashboard');
      expect(container.querySelectorAll('.habit-row')).toHaveLength(6);
      if (!aiEnabled) expect(fetchMock).not.toHaveBeenCalled();
    }
  );
});

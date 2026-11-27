// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AUTH_SESSION_KEY } from './services/authApi';

let root;
let container;
let fetchMock;
let serverHabits;
let serverCompletions;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const user = {
  id: 'user-1',
  email: 'person@example.com',
  display_name: 'Test Person',
  timezone: 'Asia/Kolkata',
  ai_enabled: false,
};
const serverHabit = {
  id: 'backend-habit',
  name: 'Backend habit',
  description: 'Loaded from the API',
  created_on: '2026-10-01',
  archived_at: null,
  reminder_time: null,
};
const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
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
const setField = async (name, value) => {
  const field = activeDialog().querySelector(`[name="${name}"]`) ||
    [...activeDialog().querySelectorAll('input,textarea')].find((item) =>
      item.labels?.[0]?.textContent.startsWith(name)
    );
  expect(field).toBeTruthy();
  const prototype =
    field.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });
};
const submit = () =>
  act(async () =>
    activeDialog()
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );
const mount = () => act(async () => root.render(<App />));

beforeEach(() => {
  window.history.replaceState(null, '', '/app');
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-22T12:00:00+05:30'));
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
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
  localStorage.clear();
  sessionStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({ access_token: 'test-token', user })
  );
  serverHabits = [{ ...serverHabit }];
  serverCompletions = { 'backend-habit': ['2026-11-21'] };
  fetchMock = vi.fn(async (url, options = {}) => {
    const path = new URL(url).pathname;
    const method = options.method || 'GET';
    if (path === '/api/auth/me') return jsonResponse(user);
    if (path === '/api/auth/login' && method === 'POST')
      return jsonResponse({ access_token: 'test-token', user });
    if (path === '/api/habits' && method === 'GET')
      return jsonResponse(serverHabits);
    if (path === '/api/completions') return jsonResponse(serverCompletions);
    if (path === '/api/habits' && method === 'POST') {
      const body = JSON.parse(options.body);
      const created = {
        ...serverHabit,
        id: 'created-habit',
        ...body,
        created_on: '2026-11-22',
      };
      serverHabits.push(created);
      serverCompletions[created.id] = [];
      return jsonResponse(created, 201);
    }
    if (path === '/api/habits/created-habit' && method === 'PATCH') {
      serverHabits[1] = {
        ...serverHabits[1],
        ...JSON.parse(options.body),
      };
      return jsonResponse(serverHabits[1]);
    }
    if (path === '/api/habits/created-habit/completions/2026-11-22') {
      if (method === 'PUT')
        serverCompletions['created-habit'].push('2026-11-22');
      if (method === 'DELETE')
        serverCompletions['created-habit'] = serverCompletions[
          'created-habit'
        ].filter((day) => day !== '2026-11-22');
      return { ok: true, status: 204 };
    }
    if (path === '/api/habits/created-habit' && method === 'DELETE') {
      serverHabits = serverHabits.filter(
        (habit) => habit.id !== 'created-habit'
      );
      delete serverCompletions['created-habit'];
      return { ok: true, status: 204 };
    }
    throw new Error(`Unexpected request: ${method} ${path}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('backend-backed app', () => {
  it.each([false, true])('builds overview tiles only from the signed-in account (empty: %s)', async (empty) => {
    if (empty) {
      serverHabits = [];
      serverCompletions = {};
    }
    await mount();
    const metric = (label) => container.querySelector(`[role="group"][aria-label="${label}"] strong`).textContent;
    expect(metric('Your routines')).toBe(empty ? '0' : '1');
    expect(metric('Due today')).toBe(empty ? '0' : '1');
    expect(metric('Completed today')).toBe('0');
    expect(metric('Current streak')).toBe(empty ? '0 days' : '1 day');
    expect(container.querySelector('[role="progressbar"][aria-label="Habits completed today"]').getAttribute('aria-valuenow')).toBe('0');
  });
  it('loads habits and check-ins from the API instead of browser demo data', async () => {
    localStorage.setItem(
      'habits',
      JSON.stringify([{ id: 'local', name: 'Old local habit' }])
    );
    await mount();

    expect(container.textContent).toContain('Backend habit');
    expect(container.textContent).not.toContain('Old local habit');
    expect(localStorage.getItem('habits')).toContain('Old local habit');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/habits',
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      })
    );
    expect(
      container
        .querySelector('[aria-label="Complete: Backend habit"]')
        .getAttribute('aria-pressed')
    ).toBe('false');
  });

  it('creates, checks in, edits, and deletes habits through backend endpoints', async () => {
    await mount();
    await clickButton('Add habit');
    await setField('Habit name', 'Walk');
    await setField('Description', 'Outside');
    await submit();
    expect(container.textContent).toContain('Walk');
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          url.endsWith('/api/habits') &&
          options.method === 'POST' &&
          JSON.parse(options.body).name === 'Walk'
      )
    ).toBe(true);

    await act(async () =>
      container.querySelector('[aria-label="Complete: Walk"]').click()
    );
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          url.endsWith('/api/habits/created-habit/completions/2026-11-22') &&
          options.method === 'PUT'
      )
    ).toBe(true);

    await act(async () =>
      container.querySelector('[aria-label="Actions for Walk"]').click()
    );
    await clickButton('Edit habit', container.querySelector('[aria-label="Actions for Walk"]').closest('.actions-menu'));
    await setField('Habit name', 'Evening walk');
    await clickButton('Save changes', activeDialog());
    expect(container.textContent).toContain('Evening walk');

    await act(async () =>
      container.querySelector('[aria-label="Actions for Evening walk"]').click()
    );
    await clickButton('Delete habit', container.querySelector('[aria-label="Actions for Evening walk"]').closest('.actions-menu'));
    await clickButton('Delete habit', activeDialog());
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          url.includes('/api/habits/created-habit?permanent=true') &&
          options.method === 'DELETE'
      )
    ).toBe(true);
    expect(container.textContent).not.toContain('Evening walk');
  });

  it('shows login when there is no session and has no demo data control', async () => {
    sessionStorage.clear();
    await mount();
    expect(container.querySelector('#auth-title').textContent).toBe(
      'Welcome back'
    );
    expect(container.textContent).not.toContain('Load demo data');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps import and export out of ordinary navigation and settings', async () => {
    await mount();
    const navigation = container.querySelector('nav[aria-label="Main navigation"]');
    expect(navigation.textContent).not.toMatch(/Data|Testing tools|Import|Export/);
    await clickButton('Settings');
    expect(container.querySelector('input[type="file"]')).toBeNull();
    expect(namedButton('Export JSON')).toBeUndefined();
    expect(namedButton('Import JSON')).toBeUndefined();
    expect(namedButton('Clear all data')).toBeUndefined();
  });

  it.each(['/pratik', '/pratik/', '/Habit-Tracker-Web-App/pratik', '/Habit-Tracker-Web-App/pratik/index.html'])(
    'preserves backup tools at the direct address %s', async (path) => {
      window.history.replaceState(null, '', path);
      await mount();
      expect(namedButton('Export JSON')).toBeTruthy();
      expect(namedButton('Import JSON')).toBeTruthy();
      expect(container.querySelector('input[type="file"]')).toBeTruthy();
      await clickButton('Overview');
      expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}app`);
      expect(namedButton('Export JSON')).toBeUndefined();
    }
  );

  it('requires sign-in before showing the testing tools', async () => {
    window.history.replaceState(null, '', '/pratik');
    sessionStorage.clear();
    await mount();
    expect(container.querySelector('#auth-title').textContent).toBe('Welcome back');
    expect(namedButton('Export JSON')).toBeUndefined();
  });

  it('always opens the normal app after signing in, including from /pratik', async () => {
    window.history.replaceState(null, '', '/pratik');
    sessionStorage.clear();
    await mount();
    await act(async () => {
      for (const [name, value] of [['email', 'person@example.com'], ['password', 'existing-password']]) {
        const field = container.querySelector(`input[name="${name}"]`);
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, value);
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await act(async () => container.querySelector('#auth-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}app`);
    expect(container.querySelector('h1').textContent).toBe('Today');
    expect(namedButton('Export JSON')).toBeUndefined();
    expect(namedButton('Import JSON')).toBeUndefined();
  });

  it('returns to the public landing page when logging out of testing tools', async () => {
    window.history.replaceState(null, '', '/pratik');
    await mount();
    await clickButton('Log out');
    await clickButton('Log out', activeDialog());
    await vi.waitFor(() => expect(container.querySelector('.landing-page')).toBeTruthy());
    expect(window.location.pathname).toBe(import.meta.env.BASE_URL);
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull();
    expect(namedButton('Export JSON')).toBeUndefined();
  });

  it('opens sign-up from the landing page registration URL', async () => {
    window.history.replaceState(null, '', '/app?mode=register');
    sessionStorage.clear();
    await mount();
    expect(container.querySelector('#auth-title').textContent).toBe('Create your account');
    expect(container.querySelector('input[name="confirm_password"]')).toBeTruthy();
  });

  it.each(['/', '/Habit-Tracker-Web-App/', '/Habit-Tracker-Web-App/index.html', '/landing.html'])('keeps %s public even with a saved session', async (path) => {
    window.history.replaceState(null, '', path);
    await mount();
    await vi.waitFor(() => expect(container.querySelector('.landing-page')).toBeTruthy());
    expect(container.querySelector('a[href$="app?mode=register"]')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

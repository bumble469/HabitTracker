// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from './AuthPage';
import { AUTH_SESSION_KEY } from '../services/authApi';

let root;
let container;
let fetchMock;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const setField = async (name, value) =>
  act(async () => {
    const field = container.querySelector(`[name="${name}"]`);
    const prototype =
      field.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });

const submit = () =>
  act(async () =>
    container
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );

beforeEach(() => {
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  sessionStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AuthPage', () => {
  it('switches modes in one form while keeping the radio selector and submit action outside the scrolling fields', async () => {
    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    const frame = container.querySelector('.auth-spread');
    const form = container.querySelector('#auth-form');
    const scrollArea = container.querySelector('.auth-form-scroll');
    const loginRadio = container.querySelector('#login-tab');
    const registerRadio = container.querySelector('#register-tab');
    const submitButton = container.querySelector('.auth-submit');

    expect(loginRadio.type).toBe('radio');
    expect(registerRadio.type).toBe('radio');
    expect(loginRadio.name).toBe(registerRadio.name);
    expect(loginRadio.checked).toBe(true);
    expect(scrollArea.contains(form)).toBe(true);
    expect(scrollArea.contains(loginRadio)).toBe(false);
    expect(scrollArea.contains(submitButton)).toBe(false);
    expect(submitButton.form).toBe(form);

    await act(async () => registerRadio.click());
    expect(registerRadio.checked).toBe(true);
    expect(container.querySelector('.auth-spread')).toBe(frame);
    expect(container.querySelector('#auth-form')).toBe(form);
    expect(scrollArea.contains(container.querySelector('[name="display_name"]'))).toBe(true);
    expect(scrollArea.contains(container.querySelector('[name="confirm_password"]'))).toBe(true);

    scrollArea.scrollTop = 200;
    await act(async () => loginRadio.click());
    expect(scrollArea.scrollTop).toBe(0);
    expect(container.querySelector('[name="display_name"]')).toBeNull();
    expect(container.querySelector('[name="confirm_password"]')).toBeNull();
    expect(submitButton.form).toBe(form);
    expect(submitButton.textContent).toBe('Log in');
  });

  it('sends login credentials to the backend and stores the returned session', async () => {
    const session = {
      access_token: 'test-token',
      token_type: 'bearer',
      user: { id: 'user-1', email: 'person@example.com' },
    };
    const onAuthenticated = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => session,
    });

    await act(async () => root.render(<AuthPage onAuthenticated={onAuthenticated} />));
    await setField('email', 'person@example.com');
    await setField('password', 'password123');
    await act(async () => container.querySelector('.auth-submit').click());

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'person@example.com',
          password: 'password123',
        }),
      })
    );
    expect(JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY))).toEqual(session);
    expect(onAuthenticated).toHaveBeenCalledWith(session);
  });

  it('sends account details and the browser timezone on signup', async () => {
    const session = {
      access_token: 'test-token',
      user: { id: 'user-1', email: 'person@example.com' },
    };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => session,
    });

    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    await act(async () => container.querySelector('#register-tab').click());
    await setField('display_name', 'Test Person');
    await setField('email', 'person@example.com');
    await setField('password', 'Password123!');
    await setField('confirm_password', 'Password123!');
    await submit();

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/auth/register');
    expect(JSON.parse(options.body)).toMatchObject({
      email: 'person@example.com',
      password: 'Password123!',
      display_name: 'Test Person',
      timezone: expect.any(String),
    });
  });

  it('prevents signup when the confirmation password does not match', async () => {
    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    await act(async () => container.querySelector('#register-tab').click());
    await setField('display_name', 'Test Person');
    await setField('email', 'person@example.com');
    await setField('password', 'Password123!');
    await setField('confirm_password', 'Different123!');
    await submit();

    expect(container.textContent).toContain('Passwords do not match.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('toggles password visibility on login', async () => {
    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    const password = container.querySelector('input[name="password"]');
    expect(password.type).toBe('password');
    await act(async () => container.querySelector('[aria-label="Show password"]').click());
    expect(password.type).toBe('text');
    await act(async () => container.querySelector('[aria-label="Hide password"]').click());
    expect(password.type).toBe('password');
  });

  it.each([
    ['short', 'Aa1!'],
    ['missing a capital', 'password123!'],
    ['missing a number', 'Password!'],
    ['missing a symbol', 'Password123'],
    ['using whitespace as a symbol', 'Password123 '],
  ])('blocks signup with a password that is %s', async (_reason, password) => {
    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    await act(async () => container.querySelector('#register-tab').click());
    await setField('display_name', 'Test Person');
    await setField('email', 'person@example.com');
    await setField('password', password);
    await setField('confirm_password', password);
    await submit();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toContain(
      'at least 8 characters, a capital letter, a number, and a symbol'
    );
    expect(container.querySelector('[name="password"]').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(container.querySelector('[name="password"]'));
  });

  it('updates password requirements as a signup password changes and hides them on login', async () => {
    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    expect(container.querySelector('#password-requirements')).toBeNull();
    await act(async () => container.querySelector('#register-tab').click());
    expect(container.querySelectorAll('#password-requirements li[data-met="true"]')).toHaveLength(0);
    await setField('password', 'password');
    expect(container.querySelectorAll('#password-requirements li[data-met="true"]')).toHaveLength(1);
    await setField('password', 'Password123!');
    expect(container.querySelectorAll('#password-requirements li[data-met="true"]')).toHaveLength(4);
    expect(container.querySelector('#password-requirements [role="status"]').textContent).toContain('4 of 4');
    await act(async () => container.querySelector('#login-tab').click());
    expect(container.querySelector('#password-requirements')).toBeNull();
  });

  it('keeps confirmation password visibility independent of the main password', async () => {
    await act(async () => root.render(<AuthPage onAuthenticated={vi.fn()} />));
    await act(async () => container.querySelector('#register-tab').click());
    await act(async () => container.querySelector('[aria-label="Show confirmation password"]').click());
    expect(container.querySelector('[name="confirm_password"]').type).toBe('text');
    expect(container.querySelector('[name="password"]').type).toBe('password');
  });
});

// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthScreen from './AuthScreen';
import { useAuth } from '../hooks/useAuth';
vi.mock('../hooks/useAuth', () => ({ useAuth: vi.fn() }));
let root, container, login, register;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const field = (id) => container.querySelector(`#auth-${id}`);
const enter = async (id, value) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    ).set.call(field(id), value);
    field(id).dispatchEvent(new Event('input', { bubbles: true }));
  });
const submit = () =>
  act(async () =>
    container
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  );
beforeEach(async () => {
  login = vi.fn().mockResolvedValue({});
  register = vi.fn().mockResolvedValue({});
  useAuth.mockReturnValue({ login, register });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<AuthScreen />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
describe('account authentication forms', () => {
  it('preserves password text exactly and keeps the registration minimum out of login', async () => {
    expect(field('password').getAttribute('minlength')).toBeNull();
    await enter('email', 'Alex@example.com');
    await enter('password', ' x ');
    await submit();
    expect(login).toHaveBeenCalledWith({
      email: 'Alex@example.com',
      password: ' x ',
    });
  });
  it('registers with exact supported fields and a real deliberate timezone option', async () => {
    await act(async () => container.querySelector('.auth-alternate').click());
    expect(field('password').minLength).toBe(8);
    expect(field('password').maxLength).toBe(128);
    await enter('email', 'alex@example.com');
    await enter('password', ' password ');
    await enter('display_name', 'Alex');
    await submit();
    expect(register).toHaveBeenCalledWith({
      email: 'alex@example.com',
      password: ' password ',
      display_name: 'Alex',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(
      [...field('timezone').options].some(
        (option) => option.value === 'Asia/Kolkata'
      )
    ).toBe(true);
  });
  it('renders duplicate email and field validation errors without navigating away', async () => {
    await act(async () => container.querySelector('.auth-alternate').click());
    register.mockRejectedValue(
      Object.assign(new Error('An account with this email already exists'), {
        fields: { email: 'Email already registered' },
      })
    );
    await enter('email', 'alex@example.com');
    await enter('password', 'password');
    await submit();
    expect(container.textContent).toContain(
      'An account with this email already exists'
    );
    expect(field('email').getAttribute('aria-invalid')).toBe('true');
    expect(
      document.getElementById(field('email').getAttribute('aria-describedby'))
        .textContent
    ).toContain('Email already registered');
  });
});

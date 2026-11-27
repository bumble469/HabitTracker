// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './useAuth';
import { api, setSessionToken } from '../services/api';

let root, container, auth;
const user = {
  id: 'server-user',
  email: 'alex@example.test',
  display_name: 'Alex',
  timezone: 'Asia/Kolkata',
  ai_enabled: false,
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status });
function Harness() {
  auth = useAuth();
  return (
    <div>
      {auth.status}:{auth.user?.id}
    </div>
  );
}
const mount = async () =>
  act(async () =>
    root.render(
      <AuthProvider>
        <Harness />
      </AuthProvider>
    )
  );
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.clear();
  setSessionToken(null);
  vi.unstubAllGlobals();
});

describe('bearer session lifecycle', () => {
  it('waits for authoritative /me on restoration instead of trusting stored profile data', async () => {
    localStorage.setItem('habitTracker.accessToken', 'restored');
    let finish;
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    await mount();
    expect(auth.status).toBe('restoring');
    expect(auth.user).toBeNull();
    expect(fetch.mock.calls[0][0]).toContain('/api/auth/me');
    await act(async () => finish(json(user)));
    expect(auth.status).toBe('authenticated');
    expect(auth.user.timezone).toBe('Asia/Kolkata');
  });
  it('registers directly into a session, sends passwords unchanged, and clears on logout', async () => {
    await mount();
    fetch.mockResolvedValueOnce(
      json({ access_token: 'new-token', token_type: 'bearer', user }, 201)
    );
    await act(async () =>
      auth.register({
        email: 'Alex@example.test',
        password: '  password  ',
        timezone: user.timezone,
      })
    );
    expect(auth.user.id).toBe('server-user');
    expect(JSON.parse(fetch.mock.calls[0][1].body).password).toBe(
      '  password  '
    );
    expect(localStorage.getItem('habitTracker.accessToken')).toBe('new-token');
    await act(async () => auth.logout());
    expect(auth.user).toBeNull();
    expect(auth.status).toBe('anonymous');
    expect(localStorage.getItem('habitTracker.accessToken')).toBeNull();
  });
  it('surfaces login credentials and duplicate-email errors without redirect behavior', async () => {
    await mount();
    fetch.mockResolvedValueOnce(
      json({ detail: 'Incorrect email or password' }, 401)
    );
    await act(async () => {
      await expect(
        auth.login({ email: 'a@b.c', password: 'short' })
      ).rejects.toThrow('Incorrect email or password');
    });
    expect(auth.status).toBe('anonymous');
    fetch.mockResolvedValueOnce(
      json({ detail: 'An account with this email already exists' }, 409)
    );
    await act(async () => {
      await expect(
        auth.register({ email: 'a@b.c', password: 'password' })
      ).rejects.toMatchObject({ status: 409 });
    });
    expect(auth.status).toBe('anonymous');
  });
  it('ends an expired session and cancels account requests while keeping AI 403 signed in', async () => {
    await mount();
    fetch.mockResolvedValueOnce(json({ access_token: 'token', user }));
    await act(async () => auth.login({ email: 'a', password: 'b' }));
    fetch.mockResolvedValueOnce(
      json({ detail: 'AI features are turned off in your settings' }, 403)
    );
    await act(async () => {
      await expect(api('/api/risk')).rejects.toMatchObject({ status: 403 });
    });
    expect(auth.status).toBe('authenticated');
    fetch.mockResolvedValueOnce(json({ detail: 'Not authenticated' }, 401));
    await act(async () => {
      await expect(api('/api/habits')).rejects.toMatchObject({ status: 401 });
    });
    expect(auth.status).toBe('anonymous');
    expect(auth.error).toContain('session has expired');
  });
  it('clears this account when another tab changes identity without erasing its newer token', async () => {
    await mount();
    fetch.mockResolvedValueOnce(json({ access_token: 'old-token', user }));
    await act(async () => auth.login({ email: 'a', password: 'b' }));
    localStorage.setItem('habitTracker.accessToken', 'other-tab-token');
    await act(async () =>
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'habitTracker.accessToken',
          oldValue: 'old-token',
          newValue: 'other-tab-token',
        })
      )
    );
    expect(auth.status).toBe('anonymous');
    expect(auth.user).toBeNull();
    expect(localStorage.getItem('habitTracker.accessToken')).toBe(
      'other-tab-token'
    );
  });
});

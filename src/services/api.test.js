import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  api,
  ApiError,
  cancelAllRequests,
  getApiBaseUrl,
  setSessionToken,
} from './api';

const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => {
  setSessionToken('access-token');
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/');
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => {
  setSessionToken(null);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('FastAPI transport boundary', () => {
  it('uses the development fallback and normalizes an accidental /api suffix', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBaseUrl()).toBe('http://localhost:8000');
    vi.stubEnv('VITE_API_BASE_URL', 'https://example.test/api/');
    expect(getApiBaseUrl()).toBe('https://example.test');
  });
  it('sends JSON and only bearer identity, preserving top-level response objects', async () => {
    const habit = {
      id: 'opaque',
      name: 'Read',
      description: '',
      created_on: '2026-11-24',
      archived_at: null,
      is_demo: false,
    };
    fetch.mockResolvedValue(json(habit, 201));
    await expect(
      api('/api/habits', {
        method: 'POST',
        body: { name: 'Read', description: '' },
      })
    ).resolves.toEqual(habit);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8000/api/habits',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        body: '{"name":"Read","description":""}',
      })
    );
  });
  it('does not read a 204 body or send a request body for check-ins', async () => {
    const text = vi.fn();
    fetch.mockResolvedValue({ status: 204, ok: true, text });
    await expect(
      api('/api/habits/a/completions/2026-11-24', { method: 'PUT' })
    ).resolves.toBeUndefined();
    expect(text).not.toHaveBeenCalled();
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('body');
  });
  it('maps FastAPI field errors, string errors and HTML proxy errors readably', async () => {
    fetch.mockResolvedValueOnce(
      json(
        {
          detail: [
            {
              loc: ['body', 'habits', 0, 'name'],
              msg: 'String should have at most 200 characters',
              type: 'string_too_long',
            },
          ],
        },
        422
      )
    );
    await expect(
      api('/api/import', { method: 'POST', body: { habits: [] } })
    ).rejects.toMatchObject({
      status: 422,
      fields: { 'habits.0.name': 'String should have at most 200 characters' },
    });
    fetch.mockResolvedValueOnce(
      json({ detail: 'Demo data is already loaded' }, 409)
    );
    await expect(api('/api/demo-data', { method: 'POST' })).rejects.toThrow(
      'Demo data is already loaded'
    );
    fetch.mockResolvedValueOnce(
      new Response('<html>gateway failure</html>', { status: 502 })
    );
    await expect(api('/api/habits')).rejects.toThrow(
      'backend is unavailable (HTTP 502)'
    );
  });
  it('expires protected 401 sessions but keeps login 401 and AI 403 local', async () => {
    const expire = vi.fn();
    setSessionToken('access-token', expire);
    fetch.mockResolvedValueOnce(
      json({ detail: 'Incorrect email or password' }, 401)
    );
    await expect(
      api('/api/auth/login', {
        method: 'POST',
        body: { email: 'x', password: 'x' },
        auth: false,
      })
    ).rejects.toMatchObject({ status: 401 });
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
    expect(expire).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(
      json({ detail: 'AI features are turned off in your settings' }, 403)
    );
    await expect(api('/api/risk')).rejects.toMatchObject({ status: 403 });
    expect(expire).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(json({ detail: 'Not authenticated' }, 401));
    await expect(api('/api/habits')).rejects.toMatchObject({ status: 401 });
    expect(expire).toHaveBeenCalledOnce();
  });
  it('reports CORS/network failures without retrying a non-idempotent request', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      api('/api/import', { method: 'POST', body: { habits: [] } })
    ).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'network',
      message: expect.stringContaining('CORS_ORIGINS'),
    });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it('cancels ignored transports on account changes and ignores late responses', async () => {
    let finish;
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    const request = api('/api/habits');
    const result = expect(request).rejects.toMatchObject({
      name: 'AbortError',
    });
    setSessionToken('other-account');
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    finish(json([{ id: 'old-account' }]));
    await result;
  });
  it('times out and cancels all pending work even when fetch ignores abort', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(() => new Promise(() => {}));
    const request = api('/api/habits', { timeoutMs: 25 });
    const result = expect(request).rejects.toBeInstanceOf(ApiError);
    await vi.advanceTimersByTimeAsync(25);
    await result;
    const next = api('/api/completions');
    const cancelled = expect(next).rejects.toMatchObject({
      name: 'AbortError',
    });
    cancelAllRequests();
    await cancelled;
  });
});

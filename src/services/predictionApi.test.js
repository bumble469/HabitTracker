// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isAiEnabled,
  isApiConfigured,
  predictMissingTomorrow,
  requestAiJson,
  setAiPreference,
  validatePrediction,
} from './predictionApi';

const payload = {
  habit_id: 'real-habit',
  created_on: '2026-11-01',
  today: '2026-11-22',
  completed_dates: ['2026-11-21'],
};
const valid = {
  probability: 0.72,
  level: 'high',
  reason: 'Low completion this week',
};
const jsonResponse = (data) => ({ ok: true, json: async () => data });

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000/');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(valid)));
});
afterEach(() => {
  setAiPreference(false);
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('prediction response validation', () => {
  it('accepts finite probabilities and preserves backend levels and reasons', () => {
    expect(validatePrediction(valid)).toEqual(valid);
    expect(
      validatePrediction({ ...valid, probability: 0, level: 'backend-custom' })
    ).toEqual({ ...valid, probability: 0, level: 'backend-custom' });
    expect(validatePrediction({ ...valid, probability: 1 })).not.toBeNull();
  });
  it.each([
    null,
    {},
    { ...valid, probability: NaN },
    { ...valid, probability: Infinity },
    { ...valid, probability: -0.1 },
    { ...valid, probability: 1.1 },
    { ...valid, probability: '0.72' },
    { ...valid, reason: '' },
    { ...valid, level: ' ' },
  ])('rejects malformed prediction %j', (value) => {
    expect(validatePrediction(value)).toBeNull();
  });
});

describe('shared AI request privacy and failure handling', () => {
  it('defaults off and blocks prediction, Coach and health requests before fetch', async () => {
    expect(isAiEnabled()).toBe(false);
    for (const path of ['/predict', '/coach', '/health']) {
      await expect(requestAiJson(path, payload)).rejects.toMatchObject({
        name: 'AbortError',
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('honors a persisted off preference after a module reload', async () => {
    setAiPreference(false);
    vi.resetModules();
    const reloaded = await import('./predictionApi');
    await expect(
      reloaded.predictMissingTomorrow(payload)
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('posts only the real payload after opt-in and normalizes the URL', async () => {
    setAiPreference(true);
    await expect(predictMissingTomorrow(payload)).resolves.toEqual(valid);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      'http://localhost:8000/predict',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });
  it.each([
    '',
    'not-a-url',
    'javascript:alert(1)',
    'http://secret:password@localhost:8000',
  ])('rejects missing/invalid API configuration %s locally', async (base) => {
    vi.stubEnv('VITE_API_BASE_URL', base);
    setAiPreference(true);
    expect(isApiConfigured()).toBe(false);
    await expect(predictMissingTomorrow(payload)).rejects.toThrow(
      'The prediction service is not configured.'
    );
    expect(fetch).not.toHaveBeenCalled();
  });
  it('reports non-success status, malformed predictions, and invalid JSON', async () => {
    setAiPreference(true);
    fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(predictMissingTomorrow(payload)).rejects.toThrow('HTTP 503');
    fetch.mockResolvedValueOnce(jsonResponse({ probability: 5 }));
    await expect(predictMissingTomorrow(payload)).rejects.toThrow(
      'malformed prediction'
    );
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new SyntaxError('bad');
      },
    });
    await expect(predictMissingTomorrow(payload)).rejects.toThrow(
      'invalid JSON'
    );
  });
  it('reports a connection failure without sending automatic retries', async () => {
    setAiPreference(true);
    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(predictMissingTomorrow(payload)).rejects.toThrow(
      'Check the backend connection'
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('times out even if a transport ignores AbortSignal', async () => {
    vi.useFakeTimers();
    setAiPreference(true);
    fetch.mockImplementation(() => new Promise(() => {}));
    const pending = requestAiJson('/predict', payload, { timeoutMs: 50 });
    const assertion = expect(pending).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
  });
  it('aborts active work when switched off and ignores late data', async () => {
    setAiPreference(true);
    let resolve;
    fetch.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    const pending = predictMissingTomorrow(payload);
    const assertion = expect(pending).rejects.toMatchObject({
      name: 'AbortError',
    });
    setAiPreference(false);
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    resolve(jsonResponse(valid));
    await assertion;
    expect(localStorage.getItem('aiEnabled')).toBe('false');
  });
  it('respects an already cancelled caller without sending data', async () => {
    setAiPreference(true);
    const controller = new AbortController();
    controller.abort();
    await expect(
      predictMissingTomorrow(payload, controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('fails closed if saving the privacy preference fails', async () => {
    setAiPreference(true);
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
    expect(setAiPreference(false)).toBe(false);
    expect(isAiEnabled()).toBe(false);
    await expect(predictMissingTomorrow(payload)).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(fetch).not.toHaveBeenCalled();
    write.mockRestore();
  });
});

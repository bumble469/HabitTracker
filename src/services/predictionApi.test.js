import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('./api', () => ({ api: vi.fn() }));
import { api } from './api';
import {
  getRisk,
  getRiskHistory,
  riskErrorMessage,
  validatePrediction,
} from './predictionApi';
const valid = {
  habit_id: 'opaque-habit',
  as_of: '2026-11-23',
  risk: 0.499,
  level: 'high',
  reasons: [],
};
afterEach(() => vi.clearAllMocks());

describe('database-backed prediction contract', () => {
  it('keeps server levels and empty reasons at rounding boundaries', () => {
    expect(validatePrediction(valid)).toEqual(valid);
    expect(validatePrediction({ ...valid, risk: 0, level: 'low' }).risk).toBe(
      0
    );
    expect(
      validatePrediction({ ...valid, risk: null, level: 'not_enough_data' })
        .risk
    ).toBeNull();
  });
  it.each([
    null,
    {},
    { ...valid, risk: NaN },
    { ...valid, risk: -1 },
    { ...valid, risk: 2 },
    { ...valid, risk: null },
    { ...valid, reasons: 'reason' },
    { ...valid, as_of: '2026-02-30' },
    { ...valid, as_of: '2026-11-23T00:00:00Z' },
  ])('rejects malformed risk %j', (value) => {
    expect(validatePrediction(value)).toBeNull();
  });
  it('uses authenticated collection GET, indexes by habit id and does not post local data', async () => {
    api.mockResolvedValueOnce([
      valid,
      { ...valid, habit_id: 'other', risk: null, level: 'not_enough_data' },
    ]);
    const controller = new AbortController();
    const results = await getRisk(controller.signal);
    expect(api).toHaveBeenCalledExactlyOnceWith('/api/risk', {
      signal: controller.signal,
    });
    expect(results['opaque-habit']).toEqual(valid);
    expect(results.other.risk).toBeNull();
  });
  it('keeps sparse history dates and null points and supports inclusive windows', async () => {
    const { habit_id: _, ...point } = valid;
    const sparse = [
      point,
      { ...point, as_of: '2026-11-25', risk: null, level: 'not_enough_data' },
    ];
    api.mockResolvedValueOnce(sparse);
    expect(
      await getRiskHistory('archived/id', undefined, {
        start: '2026-11-01',
        end: '2026-11-30',
      })
    ).toEqual(sparse);
    expect(api).toHaveBeenCalledWith(
      '/api/habits/archived%2Fid/risk/history?start=2026-11-01&end=2026-11-30',
      { signal: undefined }
    );
  });
  it('reports model failure without substituting scores or retrying', async () => {
    const error = Object.assign(new Error('Model file not found.'), {
      status: 503,
    });
    api.mockRejectedValueOnce(error);
    await expect(getRisk()).rejects.toBe(error);
    expect(riskErrorMessage(error)).toContain('model is not installed');
    expect(api).toHaveBeenCalledTimes(1);
  });
});

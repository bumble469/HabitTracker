import { describe, expect, it } from 'vitest';
import { validateBackup } from './backup';

const habit = {
  id: 'h1',
  name: 'Read',
  createdAt: '2026-01-01T09:00:00',
  scheduledDays: [1, 3, 5],
};

describe('existing JSON backup format', () => {
  it('preserves habit metadata and normalizes duplicate completion dates', () => {
    const source = {
      habits: [habit],
      completions: { h1: ['2026-01-05', '2026-01-05', '2026-01-02'] },
      version: '1.0',
    };
    const result = validateBackup(source);
    expect(result.habits).toEqual([habit]);
    expect(result.completions.h1).toEqual(['2026-01-02', '2026-01-05']);
    expect(source.completions.h1).toHaveLength(3);
  });
  it.each([
    null,
    { habits: {}, completions: {} },
    { habits: [habit, habit], completions: {} },
    { habits: [{ ...habit, name: ' ' }], completions: {} },
    {
      habits: [{ ...habit, category: { unexpected: 'object' } }],
      completions: {},
    },
    { habits: [{ ...habit, source: false }], completions: {} },
    { habits: [{ ...habit, description: ['not text'] }], completions: {} },
    { habits: [habit], completions: { h1: '2026-01-05' } },
    { habits: [habit], completions: { h1: ['2026-02-30'] } },
    { habits: [habit], completions: { unknown: ['2026-01-05'] } },
    { habits: [{ ...habit, scheduledDays: [7] }], completions: {} },
    { habits: [{ ...habit, createdAt: 'invalid' }], completions: {} },
    { habits: [{ ...habit, id: '__proto__' }], completions: {} },
  ])('rejects invalid backups before replacing storage (%j)', (value) => {
    expect(() => validateBackup(value)).toThrow();
  });
  it('accepts an empty backup', () =>
    expect(validateBackup({ habits: [], completions: {} })).toEqual({
      habits: [],
      completions: {},
    }));
});

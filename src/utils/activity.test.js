import { describe, expect, it } from 'vitest';
import { activityLevel, buildActivitySummary, buildActivityYear } from './activity';

const read = { id: 'read', name: 'Read', createdAt: '2024-01-01T09:00:00' };
const walk = { id: 'walk', name: 'Walk', createdAt: '2024-01-01T09:00:00' };

describe('activity calendar summaries', () => {
  it('keeps empty days uncoloured and empty history at zero', () => {
    const summary = buildActivitySummary([], {}, '2026-11-27');
    expect(summary.counts).toEqual({});
    expect(summary.totalCheckIns).toBe(0);
    expect(summary.activeDays).toBe(0);
    expect(summary.currentStreak).toBe(0);
    expect(summary.longestStreak).toBe(0);
    expect(summary.years).toEqual([2026]);
    expect(activityLevel(0)).toBe(0);
    expect([1, 2, 3, 4, 12].map(activityLevel)).toEqual([1, 2, 3, 4, 4]);
  });

  it('counts each habit once per day and filters invalid, future, pre-creation and off-schedule dates', () => {
    const monday = { ...read, createdAt: '2026-11-02T09:00:00', scheduledDays: [1] };
    const summary = buildActivitySummary([monday, monday, walk], {
      read: ['2026-10-26', '2026-11-02', '2026-11-02', '2026-11-03', '2026-11-09', '2026-02-30', null, 'bad'],
      walk: ['2026-11-02', '2026-11-03', '2026-11-11', null, undefined, 0, '', '2026-02-30', '2026-11-02T00:00:00'],
      deleted: ['2026-11-02'],
    }, '2026-11-03');
    expect(summary.counts).toEqual({ '2026-11-02': 2, '2026-11-03': 1 });
    expect(summary.completedHabits['2026-11-02']).toEqual(['Read', 'Walk']);
    expect(summary.totalCheckIns).toBe(3);
    expect(summary.activeDays).toBe(2);
  });

  it('keeps the current streak through yesterday while today is unfinished', () => {
    const summary = buildActivitySummary([read], { read: ['2026-11-24', '2026-11-25', '2026-11-26'] }, '2026-11-27');
    expect(summary.currentStreak).toBe(3);
    expect(summary.longestStreak).toBe(3);
    expect(buildActivitySummary([read], { read: ['2026-11-25'] }, '2026-11-27').currentStreak).toBe(0);
  });

  it('counts consecutive active calendar days across habits and year boundaries', () => {
    const summary = buildActivitySummary([read, walk], {
      read: ['2025-12-28', '2025-12-29', '2025-12-31', '2026-01-02'],
      walk: ['2026-01-01', '2026-01-02'],
    }, '2026-01-03', 2025);
    expect(summary.currentStreak).toBe(3);
    expect(summary.longestStreak).toBe(3);
    expect(summary.totalCheckIns).toBe(3);
    expect(summary.activeDays).toBe(3);
    expect(summary.years).toEqual([2026, 2025]);
    const current = buildActivitySummary([read, walk], { read: ['2025-12-31'], walk: ['2026-01-01'] }, '2026-01-01');
    expect(current.currentStreak).toBe(2);
    expect(current.totalCheckIns).toBe(1);
    expect(current.activeDays).toBe(1);
  });

  it('does not infer past activity for habits with unknown creation dates', () => {
    const summary = buildActivitySummary([{ id: 'h', name: 'Imported' }], { h: ['2026-11-26', '2026-11-27'] }, '2026-11-27');
    expect(summary.counts).toEqual({ '2026-11-27': 1 });
  });

  it('builds complete leap and non-leap years, padded to Sunday-based weeks', () => {
    const leap = buildActivityYear(2024);
    expect(leap.every((week) => week.length === 7)).toBe(true);
    expect(leap.flat().filter(Boolean)).toHaveLength(366);
    expect(leap.flat()).toContain('2024-02-29');
    expect(leap[0][0]).toBeNull();
    expect(leap[0][1]).toBe('2024-01-01');
    const regular = buildActivityYear(2026);
    expect(regular.flat().filter(Boolean)).toHaveLength(365);
    expect(regular.flat()).not.toContain('2026-02-29');
  });
});

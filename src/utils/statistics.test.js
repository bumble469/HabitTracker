import { describe, expect, it } from 'vitest';
import { buildStatistics } from './statistics';

const habit = { id: 'h1', name: 'Read', createdAt: '2026-12-30T09:00:00' };

describe('existing statistics with eligible local dates', () => {
  it('excludes future days and days before creation from monthly denominator', () => {
    const stats = buildStatistics(
      [habit],
      { h1: ['2026-12-29', '2026-12-30', '2027-01-02'] },
      '2026-12-31'
    );
    expect(stats.monthlyOpportunities).toBe(2);
    expect(stats.monthlyCompleted).toBe(1);
    expect(stats.monthlyRate).toBe(50);
    expect(stats.habitStats[0].completed).toBe(1);
  });
  it('uses actual past 14 days across year boundaries and marks no-opportunity days unknown', () => {
    const stats = buildStatistics([habit], { h1: [] }, '2027-01-02');
    expect(stats.daily).toHaveLength(14);
    expect(stats.daily[0].date).toBe('2026-12-20');
    expect(stats.daily.at(-1).date).toBe('2027-01-02');
    expect(stats.daily[0].rate).toBeNull();
    expect(stats.daily.at(-1).rate).toBe(0);
    expect(stats.monthlyOpportunities).toBe(2);
  });
  it('respects weekday schedules and duplicate completions', () => {
    const scheduled = {
      ...habit,
      createdAt: '2026-11-01T09:00:00',
      scheduledDays: [1],
    };
    const stats = buildStatistics(
      [scheduled],
      { h1: ['2026-11-02', '2026-11-02', '2026-11-03'] },
      '2026-11-10'
    );
    expect(stats.monthlyOpportunities).toBe(2);
    expect(stats.monthlyCompleted).toBe(1);
    expect(stats.monthlyRate).toBe(50);
  });
});

import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildDropOffSummary,
  buildInsights,
  buildWeekdayData,
  buildWeeklyData,
  completionRate,
  currentStreak,
  daysBetween,
  eligibleDays,
  formatProbability,
  habitCreatedKey,
  isEligibleDay,
  longestStreak,
  parseDateKey,
  rankHabitsByRisk,
  toDateKey,
} from './insights';

const habit = { id: 'h1', name: 'Read', createdAt: '2026-11-01' };
const prediction = (probability, level = 'medium') => ({
  probability,
  level,
  reason: 'Backend reason',
});

describe('local calendar dates and eligible opportunities', () => {
  it('preserves date-only keys and uses local components for timestamps', () => {
    expect(toDateKey('2026-01-01')).toBe('2026-01-01');
    expect(toDateKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(
      habitCreatedKey({ createdAt: new Date(2026, 0, 1, 0, 30).toISOString() })
    ).toBe('2026-01-01');
    expect(parseDateKey('2026-01-01').getDate()).toBe(1);
    expect(toDateKey('2026-02-30')).toBe('');
    expect(Number.isNaN(parseDateKey('invalid').getTime())).toBe(true);
  });

  it('crosses month, leap-year, and year boundaries as calendar days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-12-30', '2027-01-01')).toHaveLength(3);
  });

  it('excludes future dates, dates before creation, duplicate and off-schedule completions', () => {
    expect(isEligibleDay(habit, '2026-10-31', '2026-11-22')).toBe(false);
    expect(isEligibleDay(habit, '2026-11-23', '2026-11-22')).toBe(false);
    expect(
      eligibleDays(habit, '2026-10-30', '2026-11-03', '2026-11-02')
    ).toEqual(['2026-11-01', '2026-11-02']);
    const scheduled = { ...habit, scheduledDays: [1, 3] };
    expect(
      eligibleDays(scheduled, '2026-11-02', '2026-11-08', '2026-11-22')
    ).toEqual(['2026-11-02', '2026-11-04']);
    expect(
      completionRate(
        scheduled,
        {
          h1: [
            '2026-11-02',
            '2026-11-02',
            '2026-11-03',
            '2026-10-31',
            '2026-12-01',
          ],
        },
        '2026-11-02',
        '2026-11-08',
        '2026-11-22'
      )
    ).toBe(0.5);
    expect(
      eligibleDays(
        { ...habit, days: [1, 3], scheduledDays: undefined },
        '2026-11-02',
        '2026-11-08',
        '2026-11-22'
      )
    ).toHaveLength(2);
  });

  it('does not classify unknown creation history as missed opportunities', () => {
    expect(
      completionRate(
        { id: 'legacy' },
        {},
        '2026-01-01',
        '2026-11-21',
        '2026-11-22'
      )
    ).toBeNull();
    expect(buildDropOffSummary({ id: 'legacy' }, {}, '2026-11-22').status).toBe(
      'insufficient'
    );
  });

  it('allows a legacy habit to be checked in today without inventing earlier history', () => {
    const legacy = { id: 'legacy' };
    const today = '2026-11-22';
    expect(isEligibleDay(legacy, today, today)).toBe(true);
    expect(isEligibleDay(legacy, '2026-11-21', today)).toBe(false);
    expect(eligibleDays(legacy, '2026-01-01', today, today)).toEqual([today]);
    expect(
      completionRate(legacy, { legacy: [today] }, '2026-01-01', today, today)
    ).toBe(1);
    expect(currentStreak(legacy, { legacy: [today] }, today)).toBe(1);
    expect(longestStreak(legacy, { legacy: [today] }, today)).toBe(1);
    expect(isEligibleDay({ ...legacy, days: [1] }, today, today)).toBe(false);
    expect(
      eligibleDays({ ...legacy, days: [1] }, '2026-01-01', today, today)
    ).toEqual([]);
    expect(buildDropOffSummary(legacy, { legacy: [today] }, today).status).toBe(
      'insufficient'
    );
  });
});

describe('local Insights calculations', () => {
  it('distinguishes empty history, zero completions, and no eligible history', () => {
    const empty = buildInsights([], {}, '2026-11-22');
    expect(empty.weekdayData.every((day) => day.rate === null)).toBe(true);
    expect(empty.weeklyData.every((week) => week.rate === null)).toBe(true);
    expect(empty.dropOffs).toEqual([]);
    const zero = buildWeeklyData([habit], {}, '2026-11-22', 1)[0];
    expect(zero).toMatchObject({ completed: 0, opportunities: 7, rate: 0 });
    const future = buildWeeklyData(
      [{ ...habit, createdAt: '2026-12-01' }],
      {},
      '2026-11-22',
      1
    )[0];
    expect(future).toMatchObject({ opportunities: 0, rate: null });
  });

  it('handles one day of data without fabricating earlier rates', () => {
    const newHabit = { ...habit, createdAt: '2026-11-18' };
    const data = buildWeeklyData(
      [newHabit],
      { h1: ['2026-11-18'] },
      '2026-11-18',
      2
    );
    expect(data[0].rate).toBeNull();
    expect(data[1]).toMatchObject({
      startKey: '2026-11-16',
      endKey: '2026-11-18',
      partial: true,
      opportunities: 1,
      completed: 1,
      rate: 100,
    });
    expect(buildDropOffSummary(newHabit, {}, '2026-11-18').status).toBe(
      'insufficient'
    );
  });

  it('uses Monday–Sunday weeks and the actual elapsed-day denominator', () => {
    const data = buildWeeklyData(
      [habit],
      { h1: ['2026-11-16', '2026-11-18', '2026-11-20'] },
      '2026-11-18',
      2
    );
    expect(data[1]).toMatchObject({
      startKey: '2026-11-16',
      endKey: '2026-11-18',
      opportunities: 3,
      completed: 2,
      rate: 67,
      partial: true,
    });
    expect(data[0]).toMatchObject({
      startKey: '2026-11-09',
      endKey: '2026-11-15',
      opportunities: 7,
      partial: false,
    });
    expect(
      buildWeeklyData(
        [{ ...habit, createdAt: '2026-12-01' }],
        {},
        '2027-01-01',
        1
      )[0]
    ).toMatchObject({
      startKey: '2026-12-28',
      endKey: '2027-01-01',
      opportunities: 5,
    });
  });

  it('uses eligible opportunities per weekday and omits unobserved weekdays', () => {
    const scheduled = { ...habit, scheduledDays: [1, 3] };
    const data = buildWeekdayData(
      [scheduled],
      { h1: ['2026-11-16'] },
      '2026-11-18',
      1
    );
    expect(data[0]).toMatchObject({
      day: 'Mon',
      completed: 1,
      opportunities: 1,
      rate: 100,
    });
    expect(data[1]).toMatchObject({ day: 'Tue', opportunities: 0, rate: null });
    expect(data[2]).toMatchObject({
      day: 'Wed',
      completed: 0,
      opportunities: 1,
      rate: 0,
    });
  });

  it('counts complete histories at 100 percent', () => {
    const allDates = daysBetween('2026-11-01', '2026-11-22');
    expect(
      completionRate(
        habit,
        { h1: allDates },
        '2026-10-01',
        '2026-11-22',
        '2026-11-22'
      )
    ).toBe(1);
    expect(
      buildWeeklyData([habit], { h1: allDates }, '2026-11-22', 3).every(
        (week) => week.rate === 100
      )
    ).toBe(true);
  });

  it('requires two full observed windows and repeated opportunities for drop-off', () => {
    expect(buildDropOffSummary(habit, {}, '2026-11-22').status).toBe(
      'insufficient'
    );
    const older = { ...habit, createdAt: '2026-10-01' };
    const data = buildDropOffSummary(
      older,
      { h1: daysBetween('2026-10-26', '2026-11-08') },
      '2026-11-22'
    );
    expect(data).toMatchObject({
      status: 'ready',
      previousRate: 1,
      recentRate: 0,
      change: -1,
      previousOpportunities: 14,
      recentOpportunities: 14,
    });
    expect(
      buildDropOffSummary({ ...older, days: [1] }, {}, '2026-11-22').status
    ).toBe('insufficient');
  });

  it('keeps zero-completion and tied drop-off histories neutral', () => {
    const older = { ...habit, createdAt: '2026-10-01' };
    expect(buildDropOffSummary(older, {}, '2026-11-22')).toMatchObject({
      status: 'ready',
      previousRate: 0,
      recentRate: 0,
      change: 0,
    });
    const allDates = daysBetween('2026-10-01', '2026-11-22');
    expect(
      buildDropOffSummary(older, { h1: allDates }, '2026-11-22')
    ).toMatchObject({ previousRate: 1, recentRate: 1, change: 0 });
  });

  it('retains schedule-aware current streaks and achievement history', () => {
    const scheduled = { ...habit, days: [1, 3, 5] };
    const history = {
      h1: ['2026-11-09', '2026-11-11', '2026-11-13', '2026-11-16'],
    };
    expect(currentStreak(scheduled, history, '2026-11-18')).toBe(4);
    expect(currentStreak(scheduled, history, '2026-11-19')).toBe(0);
    expect(longestStreak(scheduled, history, '2026-11-22')).toBe(4);
  });
});

describe('backend risk presentation', () => {
  it('formats only finite valid probabilities', () => {
    expect(formatProbability(0)).toBe('0%');
    expect(formatProbability(0.724)).toBe('72%');
    expect(formatProbability(1)).toBe('100%');
    [NaN, Infinity, -0.1, 1.1, undefined, '0.7'].forEach((value) =>
      expect(formatProbability(value)).toBe('Unavailable')
    );
  });

  it('ranks valid risk only, descending with stable ties, without interpreting unavailable as low', () => {
    const habits = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id }));
    const ranked = rankHabitsByRisk(habits, {
      a: prediction(0.7),
      b: { unavailable: true },
      c: prediction(0.9),
      d: prediction(0.7),
      e: prediction(1.2),
      f: prediction(NaN),
    });
    expect(ranked.map((h) => h.id)).toEqual(['c', 'a', 'd']);
  });
});

it('computes a representative year locally in under two seconds', () => {
  const today = '2026-11-22';
  const history = daysBetween(addDays(today, -364), today);
  const habits = Array.from({ length: 30 }, (_, index) => ({
    id: `perf-${index}`,
    createdAt: addDays(today, -364),
    name: `Habit ${index}`,
  }));
  const completions = Object.fromEntries(
    habits.map((h, index) => [
      h.id,
      history.filter((_, day) => (day + index) % 3 !== 0),
    ])
  );
  const started = performance.now();
  const result = buildInsights(habits, completions, today, 52);
  const elapsed = performance.now() - started;
  expect(result.weeklyData).toHaveLength(52);
  expect(elapsed).toBeLessThan(2000);
  console.info(
    `Local Insights benchmark: 30 habits × 365 days, ${elapsed.toFixed(1)}ms (API excluded).`
  );
});

import { addDays, daysBetween, isEligibleDay, parseDateKey, toDateKey } from './insights';

// A check-in is counted once per habit and local day, using the same eligibility
// rules as the rest of the app. Streaks here mean consecutive calendar days with
// at least one check-in, rather than a single habit's scheduled-day streak.
export function buildActivitySummary(habits = [], completions = {}, today = toDateKey(), year = Number(today.slice(0, 4))) {
  const counts = {};
  const completedHabits = {};
  const seenHabits = new Set();
  habits.forEach((habit) => {
    if (seenHabits.has(habit.id)) return;
    seenHabits.add(habit.id);
    const history = Array.isArray(completions[habit.id]) ? completions[habit.id] : [];
    new Set(history).forEach((date) => {
      if (Number.isNaN(parseDateKey(date).getTime()) || !isEligibleDay(habit, date, today)) return;
      counts[date] = (counts[date] || 0) + 1;
      (completedHabits[date] ||= []).push(habit.name);
    });
  });

  const activeDates = Object.keys(counts).sort();
  const yearDates = activeDates.filter((date) => Number(date.slice(0, 4)) === year);
  let currentStreak = 0;
  let cursor = counts[today] ? today : addDays(today, -1);
  while (counts[cursor]) {
    currentStreak += 1;
    cursor = addDays(cursor, -1);
  }
  let longestStreak = 0;
  let run = 0;
  let previous = '';
  activeDates.forEach((date) => {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  });

  const currentYear = Number(today.slice(0, 4));
  const firstYear = activeDates.length ? Number(activeDates[0].slice(0, 4)) : currentYear;
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, index) => currentYear - index);
  return {
    counts,
    completedHabits,
    years,
    totalCheckIns: yearDates.reduce((total, date) => total + counts[date], 0),
    activeDays: yearDates.length,
    currentStreak,
    longestStreak,
  };
}

export function activityLevel(count) {
  return Math.max(0, Math.min(4, Math.floor(count) || 0));
}

export function buildActivityYear(year) {
  const first = `${year}-01-01`;
  const last = `${year}-12-31`;
  if (!toDateKey(first) || !toDateKey(last)) return [];
  const offset = parseDateKey(first).getDay();
  const dates = [...Array(offset).fill(null), ...daysBetween(first, last)];
  while (dates.length % 7) dates.push(null);
  return Array.from({ length: dates.length / 7 }, (_, index) => dates.slice(index * 7, index * 7 + 7));
}

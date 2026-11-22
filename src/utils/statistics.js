import {
  addDays,
  eligibleDays,
  habitCreatedKey,
  isEligibleDay,
  toDateKey,
} from './insights';

export function buildStatistics(habits, completions, today = toDateKey()) {
  let monthlyCompleted = 0;
  let monthlyOpportunities = 0;
  const monthStart = `${today.slice(0, 7)}-01`;
  const habitStats = habits
    .map((habit) => {
      const recorded = new Set(completions[habit.id] || []);
      const allDays = eligibleDays(
        habit,
        habitCreatedKey(habit) || today,
        today,
        today
      );
      const completed = allDays.filter((day) => recorded.has(day)).length;
      const monthlyDays = eligibleDays(habit, monthStart, today, today);
      monthlyOpportunities += monthlyDays.length;
      monthlyCompleted += monthlyDays.filter((day) => recorded.has(day)).length;
      return {
        habit,
        completed,
        opportunities: allDays.length,
        rate: allDays.length ? completed / allDays.length : null,
      };
    })
    .sort(
      (first, second) =>
        (second.rate ?? -1) - (first.rate ?? -1) ||
        first.habit.name.localeCompare(second.habit.name)
    );
  const daily = Array.from({ length: 14 }, (_, index) => {
    const date = addDays(today, index - 13);
    const due = habits.filter((habit) => isEligibleDay(habit, date, today));
    const completed = due.filter((habit) =>
      (completions[habit.id] || []).includes(date)
    ).length;
    return {
      date,
      completed,
      opportunities: due.length,
      rate: due.length ? Math.round((completed / due.length) * 100) : null,
    };
  });
  return {
    habitStats,
    daily,
    monthlyCompleted,
    monthlyOpportunities,
    monthlyRate: monthlyOpportunities
      ? Math.round((monthlyCompleted / monthlyOpportunities) * 100)
      : null,
  };
}

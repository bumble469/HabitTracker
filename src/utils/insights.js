// Stored completion dates are local calendar keys. Missing entries on an eligible
// date since creation mean an unchecked opportunity in this application's schema.
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function parseDateKey(dateKey) {
  if (typeof dateKey !== 'string' || !DATE_KEY.test(dateKey))
    return new Date(NaN);
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : new Date(NaN);
}

export function toDateKey(date = new Date()) {
  // Parsing YYYY-MM-DD with new Date() would treat it as UTC and shift it in
  // timezones west of UTC. A date-only value already names its local date.
  if (typeof date === 'string' && DATE_KEY.test(date))
    return Number.isNaN(parseDateKey(date).getTime()) ? '' : date;
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return '';
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function addDays(dateKey, amount) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function daysBetween(startKey, endKey) {
  if (!toDateKey(startKey) || !toDateKey(endKey) || startKey > endKey)
    return [];
  const days = [];
  for (
    let cursor = startKey;
    cursor && cursor <= endKey;
    cursor = addDays(cursor, 1)
  )
    days.push(cursor);
  return days;
}

export function habitCreatedKey(habit) {
  const created = habit.createdAt || habit.created_on;
  return created ? toDateKey(created) : '';
}

function scheduledDays(habit) {
  const schedule = habit.scheduledDays || habit.days;
  return Array.isArray(schedule) && schedule.length > 0 ? schedule : null;
}

export function isEligibleDay(habit, dateKey, todayKey = toDateKey()) {
  const created = habitCreatedKey(habit);
  if (
    !toDateKey(dateKey) ||
    dateKey > todayKey ||
    (created ? dateKey < created : dateKey !== todayKey)
  )
    return false;
  const schedule = scheduledDays(habit);
  return !schedule || schedule.includes(parseDateKey(dateKey).getDay());
}

export function eligibleDays(habit, startKey, endKey, todayKey = toDateKey()) {
  const created = habitCreatedKey(habit);
  // An imported habit without creation metadata can still be checked in today;
  // earlier dates remain unknown and never become inferred missed opportunities.
  if (!created)
    return startKey <= todayKey &&
      endKey >= todayKey &&
      isEligibleDay(habit, todayKey, todayKey)
      ? [todayKey]
      : [];
  const firstKey = startKey > created ? startKey : created;
  const lastKey = endKey < todayKey ? endKey : todayKey;
  return daysBetween(firstKey, lastKey).filter((dateKey) =>
    isEligibleDay(habit, dateKey, todayKey)
  );
}

function completionCounts(habit, completions, startKey, endKey, todayKey) {
  const days = eligibleDays(habit, startKey, endKey, todayKey);
  const history = new Set(completions[habit.id] || []);
  const completed = days.reduce(
    (total, date) => total + Number(history.has(date)),
    0
  );
  return {
    completed,
    opportunities: days.length,
    rate: days.length ? completed / days.length : null,
  };
}

export function completionRate(
  habit,
  completions,
  startKey,
  endKey,
  todayKey = toDateKey()
) {
  return completionCounts(habit, completions, startKey, endKey, todayKey).rate;
}

export function currentStreak(habit, completions, todayKey = toDateKey()) {
  const created = habitCreatedKey(habit);
  const history = new Set(completions[habit.id] || []);
  if (!created)
    return Number(
      history.has(todayKey) && isEligibleDay(habit, todayKey, todayKey)
    );
  let streak = 0;
  let date = todayKey;
  while (date >= created) {
    if (isEligibleDay(habit, date, todayKey)) {
      if (history.has(date)) streak += 1;
      else if (date !== todayKey) break;
    }
    date = addDays(date, -1);
  }
  return streak;
}

export function longestStreak(habit, completions, todayKey = toDateKey()) {
  const created = habitCreatedKey(habit);
  const history = new Set(completions[habit.id] || []);
  if (!created)
    return Number(
      history.has(todayKey) && isEligibleDay(habit, todayKey, todayKey)
    );
  let longest = 0;
  let current = 0;
  eligibleDays(habit, created, todayKey, todayKey).forEach((date) => {
    current = history.has(date) ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

export function reportingPeriod(todayKey = toDateKey(), weeks = 8) {
  const safeWeeks = Math.max(1, Math.min(104, Math.floor(weeks) || 8));
  const weekday = parseDateKey(todayKey).getDay();
  const currentMonday = addDays(todayKey, -((weekday + 6) % 7));
  return {
    startKey: addDays(currentMonday, -(safeWeeks - 1) * 7),
    endKey: todayKey,
    weeks: safeWeeks,
    currentMonday,
  };
}

export function buildWeekdayData(
  habits,
  completions,
  todayKey = toDateKey(),
  weeks = 8
) {
  const { startKey } = reportingPeriod(todayKey, weeks);
  const data = WEEKDAYS.map((day) => ({
    day,
    completed: 0,
    opportunities: 0,
    rate: null,
  }));
  habits.forEach((habit) => {
    const history = new Set(completions[habit.id] || []);
    eligibleDays(habit, startKey, todayKey, todayKey).forEach((dateKey) => {
      const entry = data[(parseDateKey(dateKey).getDay() + 6) % 7];
      entry.opportunities += 1;
      entry.completed += Number(history.has(dateKey));
    });
  });
  return data.map((entry) => ({
    ...entry,
    rate: entry.opportunities
      ? Math.round((entry.completed / entry.opportunities) * 100)
      : null,
  }));
}

export function buildWeeklyData(
  habits,
  completions,
  todayKey = toDateKey(),
  weeks = 8
) {
  const { startKey, weeks: count } = reportingPeriod(todayKey, weeks);
  const historySets = new Map(
    habits.map((habit) => [habit.id, new Set(completions[habit.id] || [])])
  );
  return Array.from({ length: count }, (_, index) => {
    const weekStart = addDays(startKey, index * 7);
    const weekEnd = addDays(weekStart, 6);
    const endKey = weekEnd > todayKey ? todayKey : weekEnd;
    let completed = 0;
    let opportunities = 0;
    habits.forEach((habit) => {
      const days = eligibleDays(habit, weekStart, endKey, todayKey);
      opportunities += days.length;
      completed += days.reduce(
        (total, date) => total + Number(historySets.get(habit.id).has(date)),
        0
      );
    });
    return {
      week: parseDateKey(weekStart).toLocaleDateString('en', {
        month: 'short',
        day: 'numeric',
      }),
      startKey: weekStart,
      endKey,
      partial: endKey < weekEnd,
      rate: opportunities
        ? Math.round((completed / opportunities) * 100)
        : null,
      completed,
      opportunities,
    };
  });
}

export function buildDropOffSummary(
  habit,
  completions,
  todayKey = toDateKey()
) {
  const recentStart = addDays(todayKey, -13);
  const previousEnd = addDays(recentStart, -1);
  const previousStart = addDays(previousEnd, -13);
  const recent = completionCounts(
    habit,
    completions,
    recentStart,
    todayKey,
    todayKey
  );
  const previous = completionCounts(
    habit,
    completions,
    previousStart,
    previousEnd,
    todayKey
  );
  // A trend needs two observed 14-day windows and repeated opportunities in
  // each. Creation dates never imply knowledge of an earlier, unknown history.
  const enough =
    habitCreatedKey(habit) &&
    habitCreatedKey(habit) <= previousStart &&
    recent.opportunities >= 3 &&
    previous.opportunities >= 3;
  return {
    status: enough ? 'ready' : 'insufficient',
    recentRate: recent.rate,
    previousRate: previous.rate,
    recentOpportunities: recent.opportunities,
    previousOpportunities: previous.opportunities,
    recentCompleted: recent.completed,
    previousCompleted: previous.completed,
    recentStart,
    previousStart,
    previousEnd,
    change: enough ? recent.rate - previous.rate : null,
  };
}

export function isValidRisk(prediction) {
  return Boolean(
    prediction &&
    !prediction.unavailable &&
    Number.isFinite(prediction.probability) &&
    prediction.probability >= 0 &&
    prediction.probability <= 1 &&
    typeof prediction.level === 'string' &&
    typeof prediction.reason === 'string'
  );
}

export function formatProbability(probability) {
  return Number.isFinite(probability) && probability >= 0 && probability <= 1
    ? `${Math.round(probability * 100)}%`
    : 'Unavailable';
}

export function rankHabitsByRisk(habits, predictions = {}) {
  return habits
    .map((habit, index) => ({
      habit,
      index,
      prediction: predictions[habit.id],
    }))
    .filter(({ prediction }) => isValidRisk(prediction))
    .sort(
      (a, b) =>
        b.prediction.probability - a.prediction.probability || a.index - b.index
    )
    .map(({ habit }) => habit);
}

export function buildInsights(
  habits,
  completions,
  todayKey = toDateKey(),
  weeks = 8
) {
  return {
    period: reportingPeriod(todayKey, weeks),
    weekdayData: buildWeekdayData(habits, completions, todayKey, weeks),
    weeklyData: buildWeeklyData(habits, completions, todayKey, weeks),
    dropOffs: habits.map((habit) => ({
      habit,
      ...buildDropOffSummary(habit, completions, todayKey),
    })),
  };
}

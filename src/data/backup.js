// Validate a downloaded Habit Tracker backup before importing it to the account.
function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function validateBackup(value) {
  if (
    !value ||
    !Array.isArray(value.habits) ||
    !value.completions ||
    typeof value.completions !== 'object' ||
    Array.isArray(value.completions)
  ) {
    throw new Error(
      'Choose a Habit Tracker JSON backup containing habits and completion history.'
    );
  }
  const ids = new Set();
  for (const habit of value.habits) {
    if (
      !habit ||
      typeof habit.id !== 'string' ||
      !habit.id ||
      ['__proto__', 'constructor', 'prototype'].includes(habit.id) ||
      ids.has(habit.id) ||
      typeof habit.name !== 'string' ||
      !habit.name.trim()
    ) {
      throw new Error(
        'Every habit needs a unique ID and a name. No data has been changed.'
      );
    }
    if (
      habit.createdAt &&
      (typeof habit.createdAt !== 'string' ||
        !Number.isFinite(new Date(habit.createdAt).getTime()))
    ) {
      throw new Error(
        'A habit has an invalid creation date. No data has been changed.'
      );
    }
    if (habit.created_on && !validDateKey(habit.created_on))
      throw new Error('A habit has an invalid creation date.');
    for (const field of [
      'description',
      'category',
      'source',
      'icon',
      'color',
    ]) {
      if (habit[field] !== undefined && typeof habit[field] !== 'string')
        throw new Error(`Habit ${field} must be text.`);
    }
    for (const key of ['scheduledDays', 'days']) {
      if (
        habit[key] !== undefined &&
        (!Array.isArray(habit[key]) ||
          habit[key].some(
            (day) => !Number.isInteger(day) || day < 0 || day > 6
          ))
      ) {
        throw new Error(
          'Habit schedules must contain weekday numbers from 0 to 6.'
        );
      }
    }
    ids.add(habit.id);
  }
  for (const [id, dates] of Object.entries(value.completions)) {
    if (
      !ids.has(id) ||
      !Array.isArray(dates) ||
      dates.some((date) => !validDateKey(date))
    ) {
      throw new Error(
        'Completion history must contain valid dates for the habits in this backup.'
      );
    }
  }
  return {
    habits: value.habits.map((habit) => ({ ...habit })),
    completions: Object.fromEntries(
      [...ids].map((id) => [
        id,
        [...new Set(value.completions[id] || [])].sort(),
      ])
    ),
  };
}

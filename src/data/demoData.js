import {
  addDays,
  isEligibleDay,
  parseDateKey,
  toDateKey,
} from '../utils/insights';

// Frontend demonstration fixture only. Never loaded automatically or used as model training data.
export function createDemoData(today = toDateKey()) {
  const start = addDays(today, -83);
  const definitions = [
    ['morning-walk', 'Morning walk', '20 minutes outside', null],
    ['reading', 'Read for 20 minutes', 'A few pages before bed', null],
    ['water', 'Drink enough water', 'Keep a bottle nearby', null],
    ['stretch', 'Evening stretch', 'A short pause after the working day', null],
    [
      'focus',
      'Plan the workday',
      'Write down three priorities',
      [1, 2, 3, 4, 5],
    ],
    ['journal', 'Write in a journal', 'A few lines about the day', null],
  ];
  const habits = definitions.map(
    ([slug, name, description, scheduledDays]) => ({
      id: `demo-${today}-${slug}`,
      name,
      description,
      createdAt: `${start}T00:00:00`,
      source: 'demo',
      ...(scheduledDays ? { scheduledDays } : {}),
    })
  );
  const completions = Object.fromEntries(
    habits.map((habit, index) => {
      const history = [];
      for (let day = 0; day < 84; day += 1) {
        const date = addDays(start, day);
        const weekday = parseDateKey(date).getDay();
        const recent = day >= 70;
        const patterns = [
          day % 11 !== 0, // steady high consistency
          recent ? day % 3 === 0 : day % 7 !== 0, // recent drop-off
          day % 4 !== 0, // fairly steady
          recent ? day % 7 !== 0 : day % 3 === 0, // recent improvement
          day % 8 !== 0, // weekdays only
          weekday !== 0 && weekday !== 6 && day % 3 !== 0,
        ];
        if (isEligibleDay(habit, date, today) && patterns[index])
          history.push(date);
      }
      return [habit.id, history];
    })
  );
  return { habits, completions };
}

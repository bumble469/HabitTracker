import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isEligibleDay, parseDateKey, toDateKey } from '../utils/insights';
import './SupportingPages.css';

function CalendarView({ completions, habits, today = toDateKey() }) {
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const monthDate = parseDateKey(`${month}-01`);
  const monthLabel = monthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0
  ).getDate();
  const offset = (monthDate.getDay() + 6) % 7;
  const cells = Array.from(
    { length: Math.ceil((offset + daysInMonth) / 7) * 7 },
    (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > daysInMonth
        ? null
        : `${month}-${String(day).padStart(2, '0')}`;
    }
  );
  const dayData = Object.fromEntries(
    cells.filter(Boolean).map((date) => {
      const due = habits.filter((habit) => isEligibleDay(habit, date, today));
      const completed = due.filter((habit) =>
        (completions[habit.id] || []).includes(date)
      ).length;
      return [date, { due: due.length, completed }];
    })
  );
  const selectedHabits = habits.filter((habit) =>
    isEligibleDay(habit, selected, today)
  );
  const selectedCompleted = selectedHabits.filter((habit) =>
    (completions[habit.id] || []).includes(selected)
  ).length;
  const navigate = (direction) => {
    const next = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + direction,
      1
    );
    const key = toDateKey(next);
    setMonth(key.slice(0, 7));
    setSelected(key);
  };
  const goToday = () => {
    setMonth(today.slice(0, 7));
    setSelected(today);
  };

  return (
    <div className="calendar-layout">
      <section
        className="panel calendar-panel"
        aria-label="Completion calendar"
      >
        <div className="calendar-heading">
          <h2 className="section-title" aria-live="polite">
            {monthLabel}
          </h2>
          <div className="calendar-controls">
            <button
              className="btn btn-secondary calendar-nav-btn"
              aria-label="Previous month"
              onClick={() => navigate(-1)}
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button className="btn btn-secondary" onClick={goToday}>
              Today
            </button>
            <button
              className="btn btn-secondary calendar-nav-btn"
              aria-label="Next month"
              onClick={() => navigate(1)}
              disabled={month >= today.slice(0, 7)}
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <table className="calendar-grid">
          <caption className="visually-hidden">
            {monthLabel}. Select a day to view its habits.
          </caption>
          <thead>
            <tr>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <th key={day} scope="col">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: cells.length / 7 }, (_, row) => (
              <tr key={row}>
                {cells.slice(row * 7, row * 7 + 7).map((date, index) => {
                  if (!date) return <td key={`blank-${index}`} />;
                  const { due, completed } = dayData[date];
                  const status =
                    due === 0
                      ? 'not-due'
                      : completed === due
                        ? 'complete'
                        : completed > 0
                          ? 'partial'
                          : 'none';
                  const label = `${parseDateKey(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}, ${date > today ? 'future date' : due ? `${completed} of ${due} completed` : 'no habits due'}`;
                  return (
                    <td key={date}>
                      <button
                        className={`calendar-day calendar-day-${status}`}
                        aria-label={label}
                        aria-pressed={selected === date}
                        aria-current={date === today ? 'date' : undefined}
                        disabled={date > today}
                        onClick={() => setSelected(date)}
                      >
                        <span>{Number(date.slice(-2))}</span>
                        {due > 0 && (
                          <span
                            className={`calendar-mark calendar-mark-${status}`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="calendar-legend">
          <span>
            <i className="calendar-mark-complete" />
            All completed
          </span>
          <span>
            <i className="calendar-mark-partial" />
            Some completed
          </span>
          <span>
            <i className="calendar-mark-none" />
            None completed
          </span>
        </div>
        <p className="muted calendar-footnote">
          Only habits due on each date are counted. Future dates are excluded.
        </p>
      </section>
      <section className="panel calendar-details" aria-live="polite">
        <div className="section-copy">
          <p className="muted">Selected day</p>
          <h2 className="section-title">
            {parseDateKey(selected).toLocaleDateString(undefined, {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </h2>
          <p className="muted">
            {selectedHabits.length
              ? `${selectedCompleted} of ${selectedHabits.length} habits completed`
              : 'No habits due on this day.'}
          </p>
        </div>
        <ul className="calendar-habit-list">
          {selectedHabits.map((habit) => {
            const complete = (completions[habit.id] || []).includes(selected);
            return (
              <li key={habit.id}>
                <span
                  className={`completion-dot ${complete ? 'is-complete' : ''}`}
                  aria-hidden="true"
                >
                  {complete ? '✓' : '–'}
                </span>
                <span>{habit.name}</span>
                <span className="visually-hidden">
                  {complete ? 'Completed' : 'Not completed'}
                </span>
              </li>
            );
          })}
        </ul>
        {habits.length === 0 && (
          <p className="muted">Add a habit to start recording your calendar.</p>
        )}
      </section>
    </div>
  );
}

export default CalendarView;

import { useId, useMemo, useRef, useState } from 'react';
import { CalendarDays, Flame, TrendingUp } from 'lucide-react';
import { activityLevel, buildActivitySummary, buildActivityYear } from '../utils/activity';
import { addDays, parseDateKey, toDateKey } from '../utils/insights';
import './ActivityCalendar.css';

function dateLabel(date) {
  return parseDateKey(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ActivityCalendar({ habits = [], completions = {}, today = toDateKey() }) {
  const id = useId();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [selected, setSelected] = useState(today);
  const calendarRef = useRef(null);
  const summary = useMemo(() => buildActivitySummary(habits, completions, today, year), [habits, completions, today, year]);
  const weeks = useMemo(() => buildActivityYear(year), [year]);
  const selectedCount = summary.counts[selected] || 0;

  const changeYear = (event) => {
    const nextYear = Number(event.target.value);
    setYear(nextYear);
    setSelected(nextYear === Number(today.slice(0, 4)) ? today : `${nextYear}-12-31`);
  };
  const moveFocus = (event, date) => {
    const offsets = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = addDays(date, offsets[event.key]);
    const button = calendarRef.current?.querySelector(`[data-date="${next}"]`);
    if (button && !button.disabled) {
      setSelected(next);
      button.focus();
    }
  };

  return (
    <section className="panel activity-panel" aria-labelledby={`${id}-title`}>
      <div className="activity-heading">
        <div>
          <h2 id={`${id}-title`} className="section-title">Your activity</h2>
          <p className="activity-description">Daily habit check-ins, across the year.</p>
        </div>
        <label className="activity-year-label">
          <span className="sr-only">Activity year</span>
          <CalendarDays size={15} aria-hidden="true" />
          <select aria-label="Activity year" value={year} onChange={changeYear}>
            {[...new Set([...summary.years, year])].sort((a, b) => b - a).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      <div className="activity-metrics">
        <div><strong>{summary.totalCheckIns.toLocaleString()}</strong><span>Check-ins <small>in {year}</small></span></div>
        <div><strong>{summary.activeDays.toLocaleString()}</strong><span>Active days <small>in {year}</small></span></div>
        <div><strong><Flame size={18} aria-hidden="true" />{summary.currentStreak}</strong><span>Current streak <small>all time</small></span></div>
        <div><strong><TrendingUp size={18} aria-hidden="true" />{summary.longestStreak}</strong><span>Longest streak <small>all time</small></span></div>
      </div>

      <div className="activity-scroll" tabIndex={0} role="region" aria-label={`${year} daily activity calendar. Scroll horizontally on smaller screens.`}>
        <div className="activity-chart" style={{ '--activity-weeks': weeks.length }}>
          <div className="activity-months" aria-hidden="true">
            {weeks.map((week, index) => {
              const firstOfMonth = week.find((date) => date?.endsWith('-01'));
              return <span key={index}>{firstOfMonth ? parseDateKey(firstOfMonth).toLocaleDateString(undefined, { month: 'short' }) : ''}</span>;
            })}
          </div>
          <div className="activity-weekdays" aria-hidden="true"><span>Mon</span><span>Wed</span><span>Fri</span></div>
          <div className="activity-weeks" ref={calendarRef} role="group" aria-label="Daily check-ins. Use arrow keys to explore days.">
            {weeks.map((week, index) => (
              <div className="activity-week" key={index}>
                {week.map((date, day) => {
                  if (!date) return <span key={`blank-${day}`} className="activity-cell activity-blank" />;
                  const count = summary.counts[date] || 0;
                  const label = `${dateLabel(date)}: ${date > today ? 'future date' : `${count} ${count === 1 ? 'check-in' : 'check-ins'}`}`;
                  return <button
                    key={date}
                    type="button"
                    className={`activity-cell activity-level-${activityLevel(count)}`}
                    data-date={date}
                    data-count={count}
                    title={label}
                    aria-label={label}
                    aria-pressed={selected === date}
                    aria-current={date === today ? 'date' : undefined}
                    disabled={date > today}
                    tabIndex={selected === date ? 0 : -1}
                    onClick={() => setSelected(date)}
                    onKeyDown={(event) => moveFocus(event, date)}
                  />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="activity-legend-row">
        <p>Each square is a day. More check-ins, deeper green.</p>
        <div className="activity-legend" aria-label="Colour scale: no check-ins, 1, 2, 3, 4 or more check-ins">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => <i key={level} className={`activity-cell activity-level-${level}`} title={level === 4 ? '4 or more check-ins' : `${level} check-ins`} />)}
          <span>More</span>
        </div>
      </div>
      <div className="activity-day-detail" aria-live="polite" aria-atomic="true">
        <span><strong>{selectedCount} {selectedCount === 1 ? 'check-in' : 'check-ins'}</strong> on {dateLabel(selected)}</span>
        <span>{selectedCount ? summary.completedHabits[selected].join(' · ') : 'No check-ins recorded. Every new day is another chance.'}</span>
      </div>
      <p className="activity-streak-note">An active day has at least one completed habit. Streaks count consecutive active calendar days; today stays open until you check in.</p>
    </section>
  );
}

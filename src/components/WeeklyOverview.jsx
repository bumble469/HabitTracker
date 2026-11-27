import { useMemo } from 'react';
import {
  addDays,
  daysBetween,
  isEligibleDay,
  parseDateKey,
} from '../utils/insights';
import { ChartNoAxesCombined, ShieldCheck } from 'lucide-react';

export default function WeeklyOverview({
  habits,
  completions,
  today,
  onOpenInsights,
  onOpenSettings,
  aiEnabled,
}) {
  const days = useMemo(
    () =>
      daysBetween(addDays(today, -6), today).map((key) => {
        const due = habits.filter((habit) => isEligibleDay(habit, key, today));
        const done = due.filter((habit) =>
          (completions[habit.id] || []).includes(key)
        ).length;
        return {
          key,
          due: due.length,
          done,
          rate: due.length ? Math.round((done / due.length) * 100) : null,
          label: parseDateKey(key).toLocaleDateString(undefined, {
            weekday: 'short',
          }),
        };
      }),
    [habits, completions, today]
  );
  const total = days.reduce((sum, day) => sum + day.due, 0);
  const completed = days.reduce((sum, day) => sum + day.done, 0);
  return (
    <aside className="support-column">
      <section className="panel week-overview">
        <div className="week-header">
          <div className="panel-header">
            <div><p className="week-kicker">Consistency</p><h2 className="section-title">Last 7 days</h2></div>
            <ChartNoAxesCombined size={19} className="muted" aria-hidden="true" />
          </div>
        <div className="week-number numeric">
          {total ? `${Math.round((completed / total) * 100)}%` : '—'}
          <span>consistency</span>
        </div>
        </div>
        <p className="muted">
          {completed} of {total} planned check-ins completed
        </p>
        <div
          className="week-bars"
          role="img"
          aria-label={days
            .map((day) => `${day.label}: ${day.done} of ${day.due}`)
            .join('; ')}
        >
          {days.map((day) => (
            <div
              className={`week-day ${day.key === today ? 'current' : ''}`}
              key={day.key}
            >
              <div className="week-bar-track">
                <span style={{ height: `${day.rate || 0}%` }} />
              </div>
              <span>{day.label.slice(0, 1)}</span>
            </div>
          ))}
        </div>
        <button className="text-button" onClick={onOpenInsights}>
          View behaviour insights
        </button>
      </section>
      <section className="local-note">
        <ShieldCheck size={21} aria-hidden="true" />
        <div>
          <h2>Account & privacy</h2>
          <p>
            {aiEnabled ? 'Optional AI predictions are on.' : 'Optional AI predictions are off.'}
          </p>
          <button className="text-button" onClick={onOpenSettings}>
            Manage privacy
          </button>
        </div>
      </section>
    </aside>
  );
}

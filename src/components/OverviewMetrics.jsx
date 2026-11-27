import { CalendarDays, CircleCheck, Flame, ListChecks } from 'lucide-react';

export default function OverviewMetrics({ totalHabits, dueToday, completedToday, currentStreak }) {
  const metrics = [
    { label: 'Your routines', value: totalHabits, note: 'Habits in your account', icon: ListChecks, tone: 'sage' },
    { label: 'Due today', value: dueToday, note: 'On today’s schedule', icon: CalendarDays, tone: 'mint' },
    { label: 'Completed today', value: completedToday, note: 'Recorded check-ins', icon: CircleCheck, tone: 'olive' },
    { label: 'Current streak', value: currentStreak, note: 'Consecutive active days', icon: Flame, tone: 'warm' },
  ];
  return (
    <section className="overview-section" aria-label="Account overview">
      <div className="overview-section-heading">
        <h2>Overview</h2><span>From your saved habits and check-ins</span>
      </div>
      <div className="overview-metrics">
        {metrics.map((metric) => {
          const { label, value, note, tone } = metric;
          const Icon = metric.icon;
          return (
            <div key={label} className={`overview-metric overview-metric-${tone}`} role="group" aria-label={label}>
              <span className="overview-metric-icon"><Icon size={21} strokeWidth={1.7} aria-hidden="true" /></span>
              <div>
                <span className="overview-metric-label">{label}</span>
                <strong className="numeric">{value}{label === 'Current streak' && <small>{value === 1 ? ' day' : ' days'}</small>}</strong>
                <span className="overview-metric-note">{note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

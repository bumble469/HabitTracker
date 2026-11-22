import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { currentStreak, parseDateKey, toDateKey } from '../utils/insights';
import { buildStatistics } from '../utils/statistics';
import './SupportingPages.css';

function StatisticsDashboard({ habits, completions, today = toDateKey() }) {
  const stats = useMemo(
    () => buildStatistics(habits, completions, today),
    [habits, completions, today]
  );
  const longestCurrent = Math.max(
    ...habits.map((habit) => currentStreak(habit, completions, today)),
    0
  );
  const activeHabits = stats.habitStats.filter(
    (habit) => habit.completed > 0
  ).length;
  const month = parseDateKey(today).toLocaleDateString(undefined, {
    month: 'long',
  });
  if (habits.length === 0)
    return (
      <section className="panel empty-state">
        <h2 className="section-title">Your statistics start with a habit</h2>
        <p className="muted">
          Add a habit and check in to build a local record of your progress.
        </p>
      </section>
    );

  return (
    <div className="stack statistics-page">
      <section
        className="panel statistics-metrics"
        aria-label="Habit statistics"
      >
        <div>
          <span className="muted">Total habits</span>
          <strong>{habits.length}</strong>
        </div>
        <div>
          <span className="muted">Active habits</span>
          <strong>{activeHabits}</strong>
          <small className="muted">At least one check-in</small>
        </div>
        <div>
          <span className="muted">Longest current streak</span>
          <strong>
            {longestCurrent}
            <small> days</small>
          </strong>
        </div>
        <div>
          <span className="muted">{month} completion</span>
          <strong>
            {stats.monthlyRate === null ? '—' : `${stats.monthlyRate}%`}
          </strong>
          <small className="muted">
            {stats.monthlyCompleted} of {stats.monthlyOpportunities} due
          </small>
        </div>
      </section>
      <section className="panel statistics-chart-panel">
        <div className="section-copy">
          <h2 className="section-title">Daily completion</h2>
          <p className="muted">
            Last 14 days, through today. Completion as a share of habits due
            each day.
          </p>
        </div>
        <div
          className="statistics-chart"
          role="img"
          aria-label="Daily completion percentages over the last 14 days. Exact values are available in the table below."
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={stats.daily}
              margin={{ top: 12, right: 12, bottom: 8, left: 0 }}
              accessibilityLayer
            >
              <CartesianGrid stroke="#DFE5E0" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  parseDateKey(value).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                }
                tick={{ fill: '#5F6B64', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: '#5F6B64', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ fill: '#EAF2ED' }}
                labelFormatter={(value) =>
                  parseDateKey(value).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                }
                formatter={(value, _name, entry) => [
                  `${value}% · ${entry.payload.completed} of ${entry.payload.opportunities} due`,
                  'Completed',
                ]}
              />
              <Bar
                dataKey="rate"
                fill="#285A46"
                maxBarSize={32}
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="chart-data-details">
          <summary>View daily values</summary>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Completed / due</th>
                  <th scope="col">Completion</th>
                </tr>
              </thead>
              <tbody>
                {stats.daily.map((day) => (
                  <tr key={day.date}>
                    <th scope="row">
                      {parseDateKey(day.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </th>
                    <td>
                      {day.completed} / {day.opportunities}
                    </td>
                    <td>
                      {day.rate === null ? 'No opportunities' : `${day.rate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="panel statistics-best">
        <div className="section-copy">
          <h2 className="section-title">Top performing habits</h2>
          <p className="muted">
            Highest completion rate across eligible days since each habit was
            created.
          </p>
        </div>
        <ol className="top-habits-list">
          {stats.habitStats
            .slice(0, 3)
            .map(({ habit, completed, opportunities, rate }, index) => (
              <li key={habit.id}>
                <span className="habit-rank" aria-label={`Rank ${index + 1}`}>
                  {index + 1}
                </span>
                <div>
                  <h3>{habit.name}</h3>
                  <p className="muted">
                    {completed} of {opportunities} eligible days completed
                  </p>
                </div>
                <strong>
                  {rate === null ? '—' : `${Math.round(rate * 100)}%`}
                </strong>
              </li>
            ))}
        </ol>
      </section>
    </div>
  );
}

export default StatisticsDashboard;

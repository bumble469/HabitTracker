import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  addDays,
  buildInsights,
  formatProbability,
  isValidRisk,
  parseDateKey,
  rankHabitsByRisk,
  toDateKey,
} from '../utils/insights';
import RiskBadge from './RiskBadge';
import './InsightsDashboard.css';
import SquareChartDot from './SquareChartDot';

const formatDate = (key) =>
  parseDateKey(key).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const formatRate = (rate) =>
  rate === null ? 'No opportunities' : `${Math.round(rate * 100)}%`;
const axis = {
  fill: '#687365',
  fontSize: 11,
  fontFamily: 'var(--font-mono, "Courier New", monospace)',
};

function OpportunityTooltip({ active, payload }) {
  const entry = payload?.[0]?.payload;
  if (!active || !entry) return null;
  return (
    <div className="insights-tooltip">
      <strong>
        {entry.startKey
          ? `${formatDate(entry.startKey)} – ${formatDate(entry.endKey)}`
          : entry.day}
      </strong>
      <span>
        {entry.rate === null
          ? 'No eligible opportunities'
          : `${entry.rate}% completed`}
      </span>
      <span className="muted">
        {entry.completed} of {entry.opportunities} eligible opportunities
        {entry.partial ? ' · partial week' : ''}
      </span>
    </div>
  );
}

function ChartData({ data, weekly = false }) {
  return (
    <details className="chart-data">
      <summary>View chart data</summary>
      <div className="chart-table-wrap" role="region" aria-label="Chart data" tabIndex={0}>
        <table>
          <caption className="sr-only">
            {weekly ? 'Weekly consistency' : 'Weekday completion'}: completed
            and eligible habit opportunities
          </caption>
          <thead>
            <tr>
              <th scope="col">{weekly ? 'Week' : 'Weekday'}</th>
              <th scope="col">Completed</th>
              <th scope="col">Eligible</th>
              <th scope="col">Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.startKey || row.day}>
                <th scope="row">
                  {weekly
                    ? `${formatDate(row.startKey)} – ${formatDate(row.endKey)}${row.partial ? ' (partial)' : ''}`
                    : row.day}
                </th>
                <td>{row.completed}</td>
                <td>{row.opportunities}</td>
                <td>{row.rate === null ? '—' : `${row.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function InsightsDashboard({
  habits,
  completions,
  predictions = {},
  aiEnabled,
  predictionLoading,
  predictionError,
  onRetryPredictions,
  today = toDateKey(),
}) {
  const [weeks, setWeeks] = useState(8);
  const insights = useMemo(
    () => buildInsights(habits, completions, today, weeks),
    [habits, completions, today, weeks]
  );
  const rankedHabits = rankHabitsByRisk(habits, predictions);
  const unrankedHabits = habits.filter(
    (habit) => !isValidRisk(predictions[habit.id])
  );
  const completed = insights.weeklyData.reduce(
    (sum, week) => sum + week.completed,
    0
  );
  const opportunities = insights.weeklyData.reduce(
    (sum, week) => sum + week.opportunities,
    0
  );

  if (habits.length === 0)
    return (
      <section className="panel empty-state insights-empty">
        <div className="empty-symbol" aria-hidden="true">
          ↗
        </div>
        <h2>Your report starts here</h2>
        <p className="muted">
          Add a habit to track your consistency and progress over time.
        </p>
        <p className="muted">
          Charts and drop-off summaries work with AI disabled.
        </p>
      </section>
    );

  return (
    <div className="stack insights-report">
      <div className="insights-report-intro">
        <div>
          <p className="muted">
            Understand patterns in your account habit history.
          </p>
          <p className="report-period">
            {formatDate(insights.period.startKey)} – {formatDate(today)}
          </p>
        </div>
        <div className="period-control">
          <label htmlFor="insights-period">Reporting period</label>
          <select
            className="input"
            id="insights-period"
            value={weeks}
            onChange={(event) => setWeeks(Number(event.target.value))}
          >
            <option value={4}>4 calendar weeks</option>
            <option value={8}>8 calendar weeks</option>
            <option value={12}>12 calendar weeks</option>
          </select>
        </div>
      </div>

      <div className="insights-charts">
        <section className="panel chart-panel">
          <div className="insights-chart-heading">
            <div>
              <h2 className="section-title">Weekly consistency</h2>
              <p className="muted">Completed opportunities, week by week.</p>
            </div>
            <div className="report-metric">
              <strong>
                {opportunities
                  ? `${Math.round((completed / opportunities) * 100)}%`
                  : '—'}
              </strong>
              <span className="muted">
                {completed} of {opportunities} completed
              </span>
            </div>
          </div>
          <div
            className="insights-chart"
            role="group"
            aria-label="Weekly consistency line chart. Exact figures are available in View chart data below."
          >
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <LineChart
                data={insights.weeklyData}
                margin={{ top: 12, right: 16, bottom: 8, left: -10 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="#edf1e7" />
                <XAxis
                  dataKey="week"
                  axisLine={false}
                  tickLine={false}
                  tick={axis}
                  tickMargin={12}
                  minTickGap={18}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                  tick={axis}
                  width={54}
                />
                <Tooltip content={<OpportunityTooltip />} />
                <Line
                  name="Completion"
                  type="linear"
                  dataKey="rate"
                  stroke="#244b3d"
                  strokeWidth={1.5}
                  dot={<SquareChartDot />}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-caption">
            Weeks run Monday–Sunday. The current week ends today; future days
            are excluded.
          </p>
          <ChartData data={insights.weeklyData} weekly />
        </section>

        <section className="panel chart-panel">
          <div className="insights-chart-heading">
            <div>
              <h2 className="section-title">Completion by weekday</h2>
              <p className="muted">
                Compare eligible opportunities across days.
              </p>
            </div>
          </div>
          <div
            className="insights-chart"
            role="group"
            aria-label="Weekday completion bar chart. Exact figures are available in View chart data below."
          >
            <ResponsiveContainer width="100%" height={300} minWidth={0}>
              <BarChart
                data={insights.weekdayData}
                margin={{ top: 12, right: 8, bottom: 8, left: -10 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="#edf1e7" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={axis}
                  tickMargin={12}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                  axisLine={false}
                  tickLine={false}
                  tick={axis}
                  width={54}
                />
                <Tooltip
                  content={<OpportunityTooltip />}
                  cursor={{ fill: '#edf1e7' }}
                />
                <Bar
                  name="Completion"
                  dataKey="rate"
                  fill="#244b3d"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-caption">
            Rate = check-ins ÷ eligible habit opportunities. Unobserved days
            have no rate.
          </p>
          <ChartData data={insights.weekdayData} />
        </section>
      </div>
      <p className="insights-method muted">
        Only scheduled dates since each habit’s creation count. An unchecked
        eligible date counts as incomplete, including today. For habits without
        a known creation date, only today’s scheduled opportunity counts;
        earlier history stays unknown.
      </p>

      <section className="panel insights-risk">
        <div className="insights-section-heading">
          <div>
            <h2 className="section-title">
              Estimated chance of missing the next three days
            </h2>
            <p className="muted">
              For {formatDate(addDays(today, 1))}. Predictions are independent
              of the reporting period above.
            </p>
          </div>
          {aiEnabled && (
            <button
              type="button"
              className="btn btn-secondary prediction-retry"
              onClick={onRetryPredictions}
              disabled={predictionLoading}
            >
              {predictionLoading
                ? 'Loading AI…'
                : predictionError
                  ? 'Retry AI'
                  : 'Refresh AI'}
            </button>
          )}
        </div>
        {!aiEnabled ? (
          <div className="status-note">
            <strong>AI disabled</strong>
            <p className="muted">
              Enable AI in Settings to request predictions. Your local charts
              and summaries remain available.
            </p>
          </div>
        ) : (
          <>
            <p className="status-note" role="status">
              {predictionLoading
                ? 'Loading backend risk estimates.'
                : predictionError
                  ? `${predictionError} Your account history is still available.`
                  : 'Ranked by risk estimate for the next three days.'}
            </p>
            {rankedHabits.length > 0 && (
              <table className="risk-table">
                <caption className="sr-only">
                  Habits ranked by backend risk estimate.
                  Equal probabilities retain habit order.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Habit</th>
                    <th scope="col">Three-day risk</th>
                    <th scope="col">Risk level</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedHabits.map((habit) => {
                    const prediction = predictions[habit.id];
                    return (
                      <tr key={habit.id}>
                        <th scope="row" data-label="Habit">
                          {habit.name}
                        </th>
                        <td
                          data-label="Three-day risk"
                          className="probability-value"
                        >
                          {formatProbability(prediction.probability)}
                        </td>
                        <td data-label="Risk level">
                          <RiskBadge
                            prediction={prediction}
                            aiEnabled
                            compact
                          />
                        </td>
                        <td data-label="Reason">{prediction.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {unrankedHabits.length > 0 && (
              <div
                className="unranked-list"
                aria-label="Habits without a ranked prediction"
                tabIndex={0}
              >
                {unrankedHabits.map((habit) => (
                  <div className="unranked-row" key={habit.id}>
                    <strong>{habit.name}</strong>
                    <div>
                      <RiskBadge
                        prediction={
                          predictions[habit.id] ||
                          (predictionError && !predictionLoading
                            ? { unavailable: true, reason: predictionError }
                            : undefined)
                        }
                        aiEnabled
                      />
                      {!predictions[habit.id] && predictionLoading && (
                        <span className="sr-only">Loading prediction</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel drop-off-panel">
        <div className="insights-section-heading">
          <div>
            <h2 className="section-title">Drop-off summary</h2>
            <p className="muted">
              The last 14 days compared with the preceding 14 days. This
              comparison stays fixed when the chart period changes.
            </p>
          </div>
        </div>
        <div className="drop-off-table">
          <div className="drop-off-heading" aria-hidden="true">
            <span>Habit</span>
            <span>Previous 14 days</span>
            <span>Recent 14 days</span>
            <span>Change</span>
          </div>
          {insights.dropOffs.map(
            ({
              habit,
              status,
              recentRate,
              previousRate,
              recentCompleted,
              previousCompleted,
              recentOpportunities,
              previousOpportunities,
              change,
            }) => (
              <div className="drop-off-row" key={habit.id}>
                <strong className="drop-off-name">{habit.name}</strong>
                <div className="drop-off-number">
                  <span className="mobile-column-label">Previous 14 days</span>
                  <strong>{formatRate(previousRate)}</strong>
                  <span className="muted">
                    {previousCompleted} of {previousOpportunities}
                  </span>
                </div>
                <div className="drop-off-number">
                  <span className="mobile-column-label">Recent 14 days</span>
                  <strong>{formatRate(recentRate)}</strong>
                  <span className="muted">
                    {recentCompleted} of {recentOpportunities}
                  </span>
                </div>
                <div className="drop-off-change">
                  {status === 'insufficient' ? (
                    <span className="muted">Not enough history</span>
                  ) : (
                    <span
                      className={
                        change < 0
                          ? 'change-down'
                          : change > 0
                            ? 'change-up'
                            : 'muted'
                      }
                    >
                      {Math.abs(Math.round(change * 100)) === 0
                        ? 'Unchanged'
                        : `${change > 0 ? '+' : '−'}${Math.abs(Math.round(change * 100))} percentage points`}
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </div>
        <p className="chart-caption drop-off-caption">
          A comparison needs 28 days of observed history and at least three
          eligible opportunities in each window. Changes describe your
          check-ins; they do not establish a cause.
        </p>
      </section>
    </div>
  );
}

export default InsightsDashboard;

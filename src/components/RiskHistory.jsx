import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getRiskHistory, riskErrorMessage } from '../services/predictionApi';
import SquareChartDot from './SquareChartDot';

export default function RiskHistory({
  habit,
  enabled,
  revision = 0,
  loading = false,
  onSettings,
}) {
  const [state, setState] = useState({ key: '', items: [], error: null });
  const [retry, setRetry] = useState(0);
  const key = JSON.stringify([habit?.id, revision, retry]);
  useEffect(() => {
    if (!habit || !enabled || loading) return;
    let cancelled = false;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      try {
        const items = await getRiskHistory(habit.id, controller.signal);
        if (!cancelled) setState({ key, items, error: null });
      } catch (error) {
        if (!cancelled && error.name !== 'AbortError')
          setState({ key, items: [], error: riskErrorMessage(error) });
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key, enabled, loading, habit]);
  if (!habit) return null;
  if (!enabled)
    return (
      <section className="panel">
        <h2 className="section-title">Risk history</h2>
        <p>AI is disabled in account settings.</p>
        <button className="text-button" onClick={onSettings}>
          Open Settings
        </button>
      </section>
    );
  const pending = loading || state.key !== key;
  return (
    <section className="panel chart-panel">
      <h2 className="section-title">
        {habit.name}: saved risk history{' '}
        {habit.is_demo && <span className="demo-badge">Demo</span>}
      </h2>
      <p className="muted">
        Saved prediction snapshots by as_of date. History can be sparse;
        unavailable values are gaps. Historical check-ins can update a saved
        point after recomputation.
      </p>
      {pending ? (
        <p role="status">Loading prediction history…</p>
      ) : state.error ? (
        <div role="alert">
          <p>{state.error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Retry history
          </button>
        </div>
      ) : !state.items.length ? (
        <p>No recorded predictions yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240} minWidth={0}>
            <LineChart data={state.items} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="#edf1e7" />
              <XAxis
                dataKey="as_of"
                tick={{ fill: '#687365', fontFamily: 'var(--font-mono)' }}
              />
              <YAxis
                domain={[0, 1]}
                tick={{ fill: '#687365', fontFamily: 'var(--font-mono)' }}
                tickFormatter={(value) => `${Math.round(value * 100)}%`}
              />
              <Tooltip
                formatter={(value) => `${Math.round(value * 100)}%`}
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e3e7dd',
                  borderRadius: 10,
                  boxShadow: 'none',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <Line
                dataKey="risk"
                name="Model risk score"
                stroke="#244b3d"
                strokeWidth={1.5}
                dot={<SquareChartDot />}
                activeDot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <details className="chart-data">
            <summary>View saved predictions</summary>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date (as_of)</th>
                    <th>Score</th>
                    <th>Server level</th>
                    <th>Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {state.items.map((item) => (
                    <tr key={item.as_of}>
                      <th scope="row">{item.as_of}</th>
                      <td>
                        {item.risk === null
                          ? 'Unavailable'
                          : `${Math.round(item.risk * 100)}%`}
                      </td>
                      <td>{item.level.replaceAll('_', ' ')}</td>
                      <td>
                        {item.reasons.join(' · ') || 'No reasons supplied'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}

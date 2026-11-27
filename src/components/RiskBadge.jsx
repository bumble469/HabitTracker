import { Info } from 'lucide-react';

export default function RiskBadge({ prediction, aiEnabled, compact = false }) {
  if (!aiEnabled) return <span className="prediction-state">AI disabled</span>;
  if (!prediction)
    return (
      <span className="prediction-state" role="status">
        <span className="loading-dot" />
        Loading prediction
      </span>
    );
  // Current predictions are normalized by the hook; saved snapshots keep
  // the API's risk/reasons fields. Both describe the same model result.
  const reason =
    prediction.reason ||
    (Array.isArray(prediction.reasons)
      ? prediction.reasons.filter((value) => typeof value === 'string').join('; ')
      : '');
  const score = prediction.probability ?? prediction.risk;
  const hasScore = Number.isFinite(score) && score >= 0 && score <= 1;
  const basedOn = prediction.as_of ? (
    <p className="muted">Based on activity through {prediction.as_of}</p>
  ) : null;
  if (prediction.level === 'not_enough_data')
    return (
      <details className="risk-details">
        <summary className="prediction-state">
          Not scored yet
          <Info size={13} aria-hidden="true" />
        </summary>
        <div className="risk-reason">
          <strong>More history needed</strong>
          <p>At least 14 calendar days of history are needed before this habit can be scored.</p>
          {reason && <p>{reason}</p>}
          {basedOn}
        </div>
      </details>
    );
  if (prediction.level === 'unsupported_schedule')
    return (
      <details className="risk-details">
        <summary className="prediction-state">
          Not scored for schedule
          <Info size={13} aria-hidden="true" />
        </summary>
        <div className="risk-reason">
          <strong>Risk estimate unavailable</strong>
          <p>{reason || 'This habit schedule is not supported by predictions yet.'}</p>
          {basedOn}
        </div>
      </details>
    );
  if (prediction.unavailable || !hasScore)
    return (
      <details className="risk-details">
        <summary className="prediction-state unavailable">
          AI unavailable
          <Info size={13} aria-hidden="true" />
        </summary>
        <div className="risk-reason">
          <strong>Prediction unavailable</strong>
          <p>
            {reason ||
              'The backend could not return a prediction. Retry while AI is enabled.'}
          </p>
          {basedOn}
        </div>
      </details>
    );
  const level = typeof prediction.level === 'string' ? prediction.level.toLowerCase() : '';
  const tone = ['high', 'medium', 'low'].includes(level) ? level : 'neutral';
  const label = prediction.level || 'Unknown';
  const percentage = Math.round(score * 100);
  if (compact)
    return (
      <span className={`risk-badge risk-${tone}`}>{label} risk</span>
    );
  return (
    <details className="risk-details">
      <summary
        className={`risk-badge risk-${tone}`}
        aria-label={`${percentage}% estimated chance of missing all of the next three days, ${label} risk. Show reason`}
      >
        <span className="numeric">{percentage}%</span>{' '}
        <span>· {label} risk</span>
        <Info size={13} aria-hidden="true" />
      </summary>
      <div className="risk-reason">
        <strong>Estimated chance of missing all of the next three days</strong>
        <p>{reason || 'The model found no additional risk signals to explain.'}</p>
        {basedOn}
      </div>
    </details>
  );
}

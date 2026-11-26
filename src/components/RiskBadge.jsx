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
  if (prediction.unavailable)
    return (
      <details className="risk-details">
        <summary className="prediction-state unavailable">
          AI unavailable
          <Info size={13} aria-hidden="true" />
        </summary>
        <div className="risk-reason">
          <strong>Prediction unavailable</strong>
          <p>
            {prediction.reason ||
              'The backend could not return a prediction. Retry while AI is enabled.'}
          </p>
        </div>
      </details>
    );
  const level = prediction.level.toLowerCase();
  const tone = ['high', 'medium', 'low'].includes(level) ? level : 'neutral';
  const percentage = Math.round(prediction.probability * 100);
  if (compact)
    return (
      <span className={`risk-badge risk-${tone}`}>{prediction.level} risk</span>
    );
  return (
    <details className="risk-details">
      <summary
        className={`risk-badge risk-${tone}`}
        aria-label={`${percentage}% chance of missing tomorrow, ${prediction.level} risk. Show reason`}
      >
        <span className="numeric">{percentage}%</span>{' '}
        <span>· {prediction.level} risk</span>
        <Info size={13} aria-hidden="true" />
      </summary>
      <div className="risk-reason">
        <strong>Chance of missing tomorrow</strong>
        <p>{prediction.reason}</p>
      </div>
    </details>
  );
}

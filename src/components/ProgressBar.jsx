export default function ProgressBar({ completed, total }) {
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section className="today-progress" aria-label="Today's progress">
      <div className="progress-copy">
        <p className="progress-eyebrow">Today’s completion</p>
        <h2>
          <span className="numeric">{completed}</span>{' '}
          <span className="progress-total">of {total}</span>{' '}
          <span className="progress-label">completed today</span>
        </h2>
        <p className="muted">
          {!total
            ? 'No habits are due today.'
            : completed === total
              ? 'All of today’s habits are complete.'
              : `${total - completed} ${total - completed === 1 ? 'habit' : 'habits'} remaining today.`}
        </p>
      </div>
      <div className="progress-visual">
        <div
          className="progress-ring"
          role="progressbar"
          aria-label="Habits completed today"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="progress-ring-track" cx="60" cy="60" r="48" /><circle className="progress-ring-fill" cx="60" cy="60" r="48" strokeDasharray="301.593" strokeDashoffset={301.593 * (1 - percentage / 100)} opacity={percentage ? 1 : 0} /></svg>
          <strong className="numeric">{percentage}%</strong>
        </div>
      </div>
    </section>
  );
}

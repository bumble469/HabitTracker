export default function ProgressBar({ completed, total }) {
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  return (
    <section className="today-progress" aria-label="Today's progress">
      <div className="progress-copy">
        <p className="eyebrow">Daily check-in</p>
        <h2>
          <span className="numeric">{completed}</span>{' '}
          <span className="progress-total">/ {total}</span>{' '}
          <span className="progress-label">habits completed</span>
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
        <div className="progress-caption">
          <span>Today’s progress</span>
          <strong className="numeric">{percentage}%</strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Habits completed today"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </section>
  );
}

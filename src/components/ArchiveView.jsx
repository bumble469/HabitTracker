import { useState } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import Dialog from './Dialog';

export default function ArchiveView({
  habits,
  pending,
  onRestore,
  onDelete,
  onHistory,
}) {
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (action, id) => {
    if (busy || pending) return;
    setBusy(true);
    setError('');
    try {
      await action(id);
      setSelected(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2 className="section-title">Archived habits</h2>
          <p className="muted">
            Restore a habit with its saved history, or remove it permanently.
          </p>
        </div>
        <span className="count-label">{habits.length} archived</span>
      </div>
      {error && (
        <p className="status-note status-error" role="alert">
          {error}
        </p>
      )}
      {!habits.length ? (
        <div className="empty-state">
          <div className="empty-icon"><Archive size={26} aria-hidden="true" /></div>
          <h3>No archived habits</h3>
          <p>Archive a habit from its actions menu.</p>
        </div>
      ) : (
        <ul className="archive-list">
          {habits.map((habit) => (
            <li key={habit.id}>
              <div>
                <h3>
                  {habit.name}{' '}
                  {habit.is_demo && (
                    <span className="synthetic-label">Demo</span>
                  )}
                </h3>
                <p className="muted">{habit.description}</p>
                <small className="muted">Started {habit.created_on}</small>
              </div>
              <div className="archive-actions">
                <button
                  className="btn btn-secondary"
                  disabled={busy || pending}
                  onClick={() => run(onRestore, habit.id)}
                >
                  <RotateCcw size={15} aria-hidden="true" />
                  Restore
                </button>
                <button
                  className="text-button"
                  onClick={() => onHistory(habit.id)}
                >
                  Risk history
                </button>
                <button
                  className="text-button danger-text"
                  disabled={busy || pending}
                  onClick={() => setSelected(habit)}
                >
                  Delete permanently
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={Boolean(selected)}
        onClose={() => {
          if (!busy) setSelected(null);
        }}
        title="Permanently delete habit?"
        description={`“${selected?.name || ''}”, its completions, and its risk snapshots will be removed permanently. This cannot be undone.`}
      >
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            className="btn btn-secondary"
            data-autofocus
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
          <button
            className="btn btn-danger"
            disabled={busy || pending}
            onClick={() => run(onDelete, selected.id)}
          >
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </Dialog>
    </section>
  );
}

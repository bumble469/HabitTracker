import { useRef, useState } from 'react';
import Dialog from './Dialog';
import { validateBackup } from '../data/backup';
import { toDateKey } from '../utils/insights';
import './SupportingPages.css';

function DataExport({
  habits,
  completions,
  onImport,
  onClear,
  embedded = false,
}) {
  const [confirmation, setConfirmation] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [reading, setReading] = useState(false);
  const inputRef = useRef(null);

  const exportData = () => {
    const data = {
      habits,
      completions,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `habit-tracker-backup-${toDateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback({
      message: 'Your JSON backup has been downloaded.',
      error: false,
    });
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setFeedback({
        message: 'Choose a JSON backup smaller than 10 MB.',
        error: true,
      });
      return;
    }
    setReading(true);
    setFeedback(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = validateBackup(JSON.parse(reader.result));
        setConfirmation({ type: 'import', data });
      } catch (error) {
        setFeedback({
          message:
            error instanceof SyntaxError
              ? 'This file is not valid JSON. No data has been changed.'
              : error.message,
          error: true,
        });
      } finally {
        setReading(false);
      }
    };
    reader.onerror = () => {
      setReading(false);
      setFeedback({
        message: 'The file could not be read. Try selecting it again.',
        error: true,
      });
    };
    reader.readAsText(file);
  };

  const confirmAction = async () => {
    setReading(true);
    setFeedback(null);
    try {
      if (confirmation.type === 'import') {
        await onImport(confirmation.data.habits, confirmation.data.completions);
        setFeedback({
          message: 'Backup habits were added to your account.',
          error: false,
        });
      } else {
        await onClear();
        setFeedback({
          message: 'All account habits and check-in history have been deleted.',
          error: false,
        });
      }
      setConfirmation(null);
    } catch (error) {
      setFeedback({ message: error.message, error: true });
    } finally {
      setReading(false);
    }
  };

  return (
    <section
      className={embedded ? 'settings-section' : 'panel data-panel'}
      aria-labelledby="data-section-title"
    >
      <div className="section-copy">
        <h2 id="data-section-title" className="section-title">
          Data import & export
        </h2>
        <p className="muted">
          Your habits and check-in history are stored in your account. Download
          a JSON backup or import habits from an existing backup.
        </p>
      </div>
      <div className="settings-row">
        <div>
          <h3>Export a backup</h3>
          <p className="muted">
            Download all habits and completion dates as JSON.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportData}>
          Export JSON
        </button>
      </div>
      <div className="settings-row">
        <div>
          <h3>Import a backup</h3>
          <p className="muted">
            Adds the habits and check-ins in a backup to your account after you
            confirm.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
        >
          {reading ? 'Reading backup…' : 'Import JSON'}
        </button>
        <input
          ref={inputRef}
          aria-label="Select JSON backup"
          type="file"
          accept=".json,application/json"
          onChange={importData}
          className="visually-hidden"
          tabIndex={-1}
        />
      </div>
      <div className="settings-row">
        <div>
          <h3>Clear account data</h3>
          <p className="muted">
            Permanently remove all habits and check-in history from your
            account.
          </p>
        </div>
        <button
          className="btn btn-danger"
          onClick={() => setConfirmation({ type: 'clear' })}
          disabled={
            habits.length === 0 && Object.keys(completions).length === 0
          }
        >
          Clear all data
        </button>
      </div>
      {feedback && (
        <p
          className={
            feedback.error ? 'status-note status-error' : 'status-note'
          }
          role={feedback.error ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      )}
      <Dialog
        open={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={
          confirmation?.type === 'import'
            ? 'Import backup habits?'
            : 'Clear all account data?'
        }
        description={
          confirmation?.type === 'import'
            ? `Add ${confirmation.data.habits.length} habits and their check-in history to your account.`
            : 'This permanently removes all habits and check-in history from your account. Export a backup first if you need it.'
        }
      >
        <div className="dialog-actions">
          <button
            data-autofocus
            className="btn btn-secondary"
            onClick={() => setConfirmation(null)}
            disabled={reading}
          >
            Cancel
          </button>
          <button
            className={`btn ${confirmation?.type === 'import' ? 'btn-primary' : 'btn-danger'}`}
            onClick={confirmAction}
            disabled={reading}
          >
            {reading
              ? 'Saving…'
              : confirmation?.type === 'import'
              ? 'Import habits'
              : 'Clear all data'}
          </button>
        </div>
      </Dialog>
    </section>
  );
}

export default DataExport;

import { useState } from 'react';
import Dialog from './Dialog';
import DataExport from './DataExport';
import './SupportingPages.css';

function SettingsPanel({
  aiEnabled,
  onAiToggle,
  onLoadDemo,
  habits = [],
  completions = {},
  onImport,
  onClear,
}) {
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const loadDemo = () => {
    onLoadDemo();
    setConfirmDemo(false);
    setDemoLoaded(true);
  };
  const requestDemo = () => {
    if (habits.length || Object.keys(completions).length) setConfirmDemo(true);
    else loadDemo();
  };

  return (
    <div className="panel settings-panel">
      <section className="settings-section" aria-labelledby="ai-settings-title">
        <div className="section-copy">
          <h2 id="ai-settings-title" className="section-title">
            AI features & privacy
          </h2>
          <p className="muted">
            Optional predictions from your configured backend. All tracking and
            Insights charts work locally with AI off.
          </p>
        </div>
        <label className="settings-row ai-setting" htmlFor="ai-preference">
          <div>
            <h3>AI predictions</h3>
            <p className="muted">
              Show the chance of missing tomorrow on Today and Insights.
            </p>
          </div>
          <input
            id="ai-preference"
            className="settings-switch"
            role="switch"
            type="checkbox"
            checked={aiEnabled}
            onChange={(event) => onAiToggle(event.target.checked)}
            aria-describedby="ai-sharing-details"
          />
        </label>
        <div id="ai-sharing-details" className="privacy-note">
          <strong>{aiEnabled ? 'AI is on' : 'AI is off'}</strong>
          <p>
            When enabled, habit IDs, creation dates, today’s date, and
            completion dates are sent to the backend for predictions. Habit
            names and descriptions are not included.
          </p>
          <p>
            AI starts off and your choice is saved in this browser. Turning it
            off prevents further requests and cancels pending work where
            possible. Information already sent cannot be recalled.
          </p>
        </div>
      </section>
      {onImport && onClear && (
        <DataExport
          embedded
          habits={habits}
          completions={completions}
          onImport={onImport}
          onClear={onClear}
        />
      )}
      <section
        className="settings-section"
        aria-labelledby="demo-settings-title"
      >
        <div className="section-copy">
          <h2 id="demo-settings-title" className="section-title">
            Demo data
          </h2>
          <p className="muted">
            Explore Insights with six synthetic habits and 84 days of
            deterministic history, including steady routines, a decline, and an
            improvement.
          </p>
        </div>
        <div className="settings-row">
          <div>
            <h3>Load synthetic history</h3>
            <p className="muted">
              Replaces current habits and history. Your AI preference is
              preserved.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={requestDemo}>
            Load demo data
          </button>
        </div>
        {demoLoaded && (
          <p className="status-note" role="status">
            Synthetic demo data loaded. Open Today, Calendar, or Insights to
            explore it.
          </p>
        )}
      </section>
      <Dialog
        open={confirmDemo}
        onClose={() => setConfirmDemo(false)}
        title="Replace your data with demo habits?"
        description="This replaces your current habits and completion history with synthetic demonstration data. Export a JSON backup first if you want to keep your data. Your AI preference will be preserved."
      >
        <div className="dialog-actions">
          <button
            data-autofocus
            className="btn btn-secondary"
            onClick={() => setConfirmDemo(false)}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={loadDemo}>
            Replace with demo data
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export default SettingsPanel;

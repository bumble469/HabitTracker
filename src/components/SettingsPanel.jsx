import './SupportingPages.css';
import { useEffect, useState } from 'react';
import {
  enablePush,
  getPushStatus,
  sendPushTest,
} from '../services/pushApi';

function SettingsPanel({
  token,
  aiEnabled,
  onAiToggle,
}) {
  const [pushMessage, setPushMessage] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    let active = true;
    getPushStatus(token)
      .then((status) => {
        if (active) setPushStatus(status);
      })
      .catch((error) => {
        if (active) setPushMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function handleEnablePush() {
    setPushBusy(true);
    setPushMessage('');
    try {
      await enablePush(token);
      setPushStatus(await getPushStatus(token));
      setPushMessage('This browser is subscribed to notifications.');
    } catch (error) {
      setPushMessage(error.message);
    } finally {
      setPushBusy(false);
    }
  }

  async function handleTestPush() {
    setPushBusy(true);
    setPushMessage('');
    try {
      const result = await sendPushTest(token);
      setPushMessage(
        result.sent > 0
          ? `Test notification sent to ${result.sent} browser(s).`
          : 'The test notification could not be delivered. Please try again later.'
      );
      setPushStatus(await getPushStatus(token));
    } catch (error) {
      setPushMessage(error.message);
    } finally {
      setPushBusy(false);
    }
  }
  return (
    <div className="panel settings-panel">
      <section className="settings-section" aria-labelledby="ai-settings-title">
        <div className="section-copy">
          <h2 id="ai-settings-title" className="section-title">
            AI features & privacy
          </h2>
          <p className="muted">
            Optional predictions use your saved habits and check-ins to help
            you notice routines that may need a little more attention.
          </p>
        </div>
        <label className="settings-row ai-setting" htmlFor="ai-preference">
          <div>
            <h3>AI predictions</h3>
            <p className="muted">
              Show which habits you may be likely to miss over the next three days.
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
            When enabled, your saved habit and completion history is processed
            to estimate the risk of missing a habit. Predictions are a guide,
            not a guarantee of what will happen.
          </p>
          <p>
            This preference is saved to your account. Turning it off prevents
            new predictions from being requested.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <h2>Browser notifications</h2>
        <p className="muted" role="status">
          {pushStatus === null
            ? 'Checking browser subscription…'
            : pushStatus.subscriptions > 0
              ? `Enabled on ${pushStatus.subscriptions} browser(s).`
              : 'This browser is not subscribed yet.'}
        </p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleEnablePush}
          disabled={pushBusy}
        >
          {pushBusy ? 'Enabling…' : 'Enable browser notifications'}
        </button>
        {pushStatus?.subscriptions > 0 && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleTestPush}
            disabled={pushBusy}
          >
            Send test notification
          </button>
        )}
        {pushMessage && <p role="status">{pushMessage}</p>}
      </section>
    </div>
  );
}

export default SettingsPanel;

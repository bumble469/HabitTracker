import { useId, useState } from 'react';

const WEEKDAYS = [
  { day: 0, label: 'Sun' },
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
];

/** Shared concise form used for both creation and editing. */
export default function AddHabitForm({
  onAddHabit,
  onCancel,
  initialHabit,
  submitLabel = 'Add habit',
}) {
  const [name, setName] = useState(initialHabit?.name || '');
  const [description, setDescription] = useState(
    initialHabit?.description || ''
  );
  const [scheduledDays, setScheduledDays] = useState(
    initialHabit?.scheduledDays || WEEKDAYS.map(({ day }) => day)
  );
  const [reminderEnabled, setReminderEnabled] = useState(
    Boolean(initialHabit?.reminder_time)
  );
  const [reminderTime, setReminderTime] = useState(
    initialHabit?.reminder_time || ''
  );
  const [error, setError] = useState('');
  const id = useId();
  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a habit name.');
      return;
    }
    if (scheduledDays.length === 0) {
      setError('Select at least one day.');
      return;
    }
    if (reminderEnabled && !reminderTime) {
      setError('Choose a reminder time or turn reminders off.');
      return;
    }
    onAddHabit({
      name: name.trim(),
      description: description.trim(),
      scheduledDays,
      reminder_time: reminderEnabled ? reminderTime : null,
    });
  };
  return (
    <form onSubmit={submit} className="habit-form" noValidate>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-name`}>
          Habit name
        </label>
        <input
          id={`${id}-name`}
          className="input"
          data-autofocus
          maxLength={160}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          aria-invalid={error === 'Enter a habit name.'}
          aria-describedby={error ? `${id}-error` : undefined}
          placeholder="e.g. Read for 20 minutes"
          required
        />
        {error && (
          <p id={`${id}-error`} className="field-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${id}-description`}>
          Description <span className="muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-description`}
          className="input"
          maxLength={500}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A simple target or a reminder of what to do"
        />
      </div>
      <div className="field">
        <span className="field-label">Repeat on</span>
        <div className="habit-day-options" role="group" aria-label="Repeat on">
          {WEEKDAYS.map(({ day, label }) => (
            <label key={day} className="habit-day-option">
              <input
                type="checkbox"
                checked={scheduledDays.includes(day)}
                onChange={(event) =>
                  {
                    setError('');
                    setScheduledDays((current) =>
                      event.target.checked
                        ? [...current, day].sort((a, b) => a - b)
                        : current.filter((value) => value !== day)
                    );
                  }
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="settings-row ai-setting" htmlFor={`${id}-reminder-on`}>
          <span>
            <span className="field-label">Reminder</span>
            <span className="muted">Receive a push notification for this habit</span>
          </span>
          <input
            id={`${id}-reminder-on`}
            className="settings-switch"
            role="switch"
            type="checkbox"
            checked={reminderEnabled}
            onChange={(event) => {
              setError('');
              setReminderEnabled(event.target.checked);
            }}
          />
        </label>
        {reminderEnabled && (
          <label className="field-label" htmlFor={`${id}-reminder-time`}>
            Reminder time
            <input
              id={`${id}-reminder-time`}
              className="input"
              type="time"
              value={reminderTime}
              onChange={(event) => {
                setError('');
                setReminderTime(event.target.value);
              }}
              required
            />
          </label>
        )}
      </div>
      {!initialHabit && (
        <p className="form-hint">
          Choose the days you plan to do this habit. Reminders are optional.
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

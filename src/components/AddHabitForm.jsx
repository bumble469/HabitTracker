import { useId, useState } from 'react';

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
  const [error, setError] = useState('');
  const id = useId();
  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Enter a habit name.');
      return;
    }
    onAddHabit({ name: name.trim(), description: description.trim() });
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
          aria-invalid={Boolean(error)}
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
      {!initialHabit && (
        <p className="form-hint">
          New habits repeat daily. You can check in once each day.
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

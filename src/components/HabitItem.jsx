import { useEffect, useRef, useState } from 'react';
import {
  Check,
  MoreHorizontal,
  Pencil,
  Trash2,
  Flame,
  Award,
} from 'lucide-react';
import RiskBadge from './RiskBadge';
import Dialog from './Dialog';
import AddHabitForm from './AddHabitForm';

function scheduleLabel(habit) {
  const days = habit.scheduledDays || habit.days;
  if (!Array.isArray(days) || days.length === 7 || !days.length)
    return 'Every day';
  return days
    .map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day])
    .filter(Boolean)
    .join(', ');
}

export default function HabitItem({
  habit,
  isCompletedToday,
  streak,
  prediction,
  aiEnabled,
  eligible = true,
  onToggleComplete,
  onEdit,
  onDelete,
}) {
  const [dialog, setDialog] = useState(null);
  const isDaily =
    !Array.isArray(habit.scheduledDays) || habit.scheduledDays.length === 7;
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (event) => {
      if (!menuRef.current?.contains(event.target))
        menuRef.current?.removeAttribute('open');
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  const openDialog = (type) => {
    menuRef.current?.removeAttribute('open');
    menuRef.current?.querySelector('summary')?.focus();
    setDialog(type);
  };
  return (
    <li className={`habit-row ${isCompletedToday ? 'is-complete' : ''}`}>
      <button
        type="button"
        className="habit-check"
        disabled={!eligible}
        onClick={() => onToggleComplete(habit.id)}
        aria-pressed={isCompletedToday}
        aria-label={`${isCompletedToday ? 'Mark incomplete' : 'Complete'}: ${habit.name}`}
      >
        {isCompletedToday && (
          <Check size={23} strokeWidth={2.5} aria-hidden="true" />
        )}
      </button>
      <div className="habit-content">
        <h3>{habit.name}</h3>
        {habit.description && (
          <p className="habit-description">{habit.description}</p>
        )}
        <div className="habit-meta">
          <span>{eligible ? scheduleLabel(habit) : 'Not due today'}</span>
          {habit.category && <span>{habit.category}</span>}
          <span className="streak">
            <Flame size={14} aria-hidden="true" />
            {streak} {isDaily ? 'day' : 'scheduled-day'} streak
          </span>
          {streak >= 7 && (
            <span className="achievement">
              <Award size={14} aria-hidden="true" />
              {streak >= 30 ? '30-day badge' : '7-day badge'}
            </span>
          )}
        </div>
      </div>
      <div className="habit-prediction">
        {aiEnabled && <RiskBadge prediction={prediction} aiEnabled={aiEnabled} />}
      </div>
      <details
        className="actions-menu"
        ref={menuRef}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.currentTarget.removeAttribute('open');
            event.currentTarget.querySelector('summary')?.focus();
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            event.currentTarget.removeAttribute('open');
        }}
      >
        <summary
          className="icon-button"
          aria-label={`Actions for ${habit.name}`}
        >
          <MoreHorizontal size={20} aria-hidden="true" />
        </summary>
        <div className="actions-popover">
          <button type="button" onClick={() => openDialog('edit')}>
            <Pencil size={16} aria-hidden="true" />
            Edit habit
          </button>
          <button
            type="button"
            className="danger-text"
            onClick={() => openDialog('delete')}
          >
            <Trash2 size={16} aria-hidden="true" />
            Delete habit
          </button>
        </div>
      </details>
      <Dialog
        open={dialog === 'edit'}
        onClose={() => setDialog(null)}
        title="Edit habit"
        description="Update your habit days and optional reminder. Your check-in history is preserved."
      >
        <AddHabitForm
          initialHabit={habit}
          submitLabel="Save changes"
          onCancel={() => setDialog(null)}
          onAddHabit={(values) => {
            onEdit(habit.id, values);
            setDialog(null);
          }}
        />
      </Dialog>
      <Dialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        title="Delete habit?"
        description={`“${habit.name}” and its entire check-in history will be permanently removed.`}
      >
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            data-autofocus
            onClick={() => setDialog(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onDelete(habit.id)}
          >
            Delete habit
          </button>
        </div>
      </Dialog>
    </li>
  );
}

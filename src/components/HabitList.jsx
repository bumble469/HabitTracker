import { ListChecks, Plus } from 'lucide-react';
import HabitItem from './HabitItem';
import { currentStreak, isEligibleDay, toDateKey } from '../utils/insights';

export default function HabitList({
  habits,
  completions,
  predictions,
  aiEnabled,
  today = toDateKey(),
  onToggleComplete,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
  management = false,
}) {
  return (
    <section className={`panel habit-list-panel${management ? ' habit-management-panel' : ''}`}>
      <div className="panel-header">
        <div>
          <h2 className="section-title">
            {management ? 'All habits' : 'Today’s habits'}
          </h2>
          <p className="muted">
            {management
              ? 'Manage your daily routines and check-in history.'
              : 'Check off a habit when you’re done.'}
          </p>
        </div>
        <span className="count-label">
          {habits.length} {habits.length === 1 ? 'habit' : 'habits'}
        </span>
      </div>
      {!habits.length ? (
        <div className="empty-state">
          <div className="empty-icon">
            <ListChecks size={28} aria-hidden="true" />
          </div>
          <h3>{management ? 'No habits yet' : 'Start with one habit'}</h3>
          <p>Add a simple daily routine to start tracking your progress.</p>
          <button className="btn btn-primary" onClick={onAddHabit}>
            <Plus size={17} aria-hidden="true" />
            Add habit
          </button>
        </div>
      ) : (
        <div className="habit-list-scroll" role="region" aria-label={management ? 'Your habit list' : 'Today’s habit list'} tabIndex={0}>
        <ul className="habit-list">
          {habits.map((habit) => (
            <HabitItem
              key={habit.id}
              habit={habit}
              isCompletedToday={(completions[habit.id] || []).includes(today)}
              prediction={predictions?.[habit.id]}
              aiEnabled={aiEnabled}
              streak={currentStreak(habit, completions, today)}
              eligible={isEligibleDay(habit, today, today)}
              onToggleComplete={onToggleComplete}
              onEdit={onEditHabit}
              onDelete={onDeleteHabit}
            />
          ))}
        </ul>
        </div>
      )}
    </section>
  );
}

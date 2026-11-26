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
    <section className="panel habit-list-panel">
      <div className="panel-header">
        <div>
          <h2 className="section-title">
            {management ? 'All habits' : 'Your habits'}
          </h2>
          <p className="muted">
            {management
              ? 'Manage your daily routines and check-in history.'
              : 'Check in as you complete each habit.'}
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
      )}
    </section>
  );
}

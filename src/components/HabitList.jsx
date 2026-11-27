import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ListChecks, Plus } from 'lucide-react';
import HabitItem from './HabitItem';
import { currentStreak, isEligibleDay, toDateKey } from '../utils/insights';

export const HABITS_PER_PAGE = 10;

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
  const [page, setPage] = useState(1);
  const panelRef = useRef(null);

  // Only the "All habits" view paginates; the dashboard list keeps its compact scroll area.
  const totalPages = management
    ? Math.max(1, Math.ceil(habits.length / HABITS_PER_PAGE))
    : 1;
  // Clamp so deleting the last habit on a page never leaves an empty page.
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * HABITS_PER_PAGE;
  const visibleHabits = management
    ? habits.slice(start, start + HABITS_PER_PAGE)
    : habits;

  const goToPage = (next) => {
    setPage(Math.min(Math.max(next, 1), totalPages));
    // The page itself scrolls, so bring the top of the list back into view.
    panelRef.current?.closest('.page-content')?.scrollTo?.({ top: 0 });
  };

  return (
    <section
      ref={panelRef}
      className={`panel habit-list-panel${management ? ' habit-management-panel' : ''}`}
    >
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
        <>
          <div
            className="habit-list-scroll"
            role="region"
            aria-label={management ? 'Your habit list' : 'Today’s habit list'}
            tabIndex={management ? undefined : 0}
          >
            <ul className="habit-list">
              {visibleHabits.map((habit) => (
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
          {management && totalPages > 1 && (
            <nav className="habit-pagination" aria-label="Habit list pages">
              <span className="habit-pagination-summary">
                Showing {start + 1}–{Math.min(start + HABITS_PER_PAGE, habits.length)} of{' '}
                {habits.length}
              </span>
              <div className="habit-pagination-controls">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>
                <span className="habit-pagination-page" aria-live="polite">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

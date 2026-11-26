import { lazy, Suspense, useRef, useState } from 'react';
import {
  CalendarDays,
  ChartColumn,
  ChartNoAxesCombined,
  Check,
  ChevronsUpDown,
  Database,
  LayoutDashboard,
  ListChecks,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import useLocalStorage from './hooks/useLocalStorage';
import useLocalDate from './hooks/useLocalDate';
import usePredictions from './hooks/usePredictions';
import { setAiPreference } from './services/predictionApi';
import AddHabitForm from './components/AddHabitForm';
import HabitList from './components/HabitList';
import ProgressBar from './components/ProgressBar';
import CalendarView from './components/CalendarView';
import DataExport from './components/DataExport';
import SettingsPanel from './components/SettingsPanel';
import WeeklyOverview from './components/WeeklyOverview';
import Dialog from './components/Dialog';
import { createDemoData } from './data/demoData';
import { isEligibleDay, parseDateKey } from './utils/insights';

const StatisticsDashboard = lazy(
  () => import('./components/StatisticsDashboard')
);
const InsightsDashboard = lazy(() => import('./components/InsightsDashboard'));

const destinations = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'statistics', label: 'Statistics', icon: ChartColumn },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesCombined },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [habits, setHabits, habitStorageError] = useLocalStorage('habits', []);
  const [completions, setCompletions, completionStorageError] = useLocalStorage(
    'completions',
    {}
  );
  const [aiEnabled, setAiEnabled, preferenceError] = useLocalStorage(
    'aiEnabled',
    false
  );
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const headingRef = useRef(null);
  const today = useLocalDate();
  const predictions = usePredictions({
    habits,
    completions,
    today,
    enabled: aiEnabled,
    active: ['dashboard', 'habits', 'insights'].includes(activeTab),
    revision: dataRevision,
  });
  const destination = destinations.find((tab) => tab.id === activeTab);
  const CurrentIcon = destination.icon;
  const navigate = (id) => {
    setActiveTab(id);
    setMobileNavOpen(false);
    setNotice('');
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const addHabit = (values) => {
    setHabits((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        ...values,
        createdAt: new Date().toISOString(),
        color: 'bg-green-600',
        icon: '○',
      },
    ]);
    setAddOpen(false);
    setNotice('Habit added.');
  };
  const editHabit = (id, values) => {
    setHabits((current) =>
      current.map((habit) =>
        habit.id === id ? { ...habit, ...values } : habit
      )
    );
    setNotice('Habit updated.');
  };
  const deleteHabit = (id) => {
    setHabits((current) => current.filter((habit) => habit.id !== id));
    setCompletions((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setDataRevision((value) => value + 1);
    setNotice('Habit deleted.');
    headingRef.current?.focus();
  };
  const toggleComplete = (id) => {
    if (
      !habits.some(
        (habit) => habit.id === id && isEligibleDay(habit, today, today)
      )
    )
      return;
    setCompletions((current) => {
      const history = current[id] || [];
      return {
        ...current,
        [id]: history.includes(today)
          ? history.filter((day) => day !== today)
          : [...history, today],
      };
    });
  };
  const replaceData = (nextHabits, nextCompletions) => {
    setHabits(nextHabits);
    setCompletions(nextCompletions);
    setDataRevision((value) => value + 1);
  };
  const loadDemoData = () => {
    const data = createDemoData(today);
    replaceData(data.habits, data.completions);
  };
  const toggleAi = (value) => {
    const saved = setAiPreference(value);
    setAiEnabled(saved ? value : false);
    if (!saved)
      setNotice('AI is off because the preference could not be saved.');
  };
  const due = habits.filter((habit) => isEligibleDay(habit, today, today));
  const completed = due.filter((habit) =>
    (completions[habit.id] || []).includes(today)
  ).length;
  const listProps = {
    habits,
    completions,
    predictions: predictions.results,
    aiEnabled,
    today,
    onToggleComplete: toggleComplete,
    onEditHabit: editHabit,
    onDeleteHabit: deleteHabit,
    onAddHabit: () => setAddOpen(true),
  };
  const navigation = (
    <nav aria-label="Main navigation">
      {destinations.map((tab) => {
        const { id, label } = tab;
        const Icon = tab.icon;
        return (
          <button
            key={id}
            type="button"
            className={`nav-item ${id === activeTab ? 'active' : ''} ${id === 'settings' ? 'nav-settings' : ''}`}
            aria-current={id === activeTab ? 'page' : undefined}
            onClick={() => navigate(id)}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#main-content"
          onClick={() => navigate('dashboard')}
        >
          <span className="brand-mark">
            <Check size={23} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span>
            Habit Tracker
            <span className="brand-caption">Behaviour Insights & AI Coach</span>
          </span>
        </a>
        {navigation}
        <div className="sidebar-footer">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>Stored in your browser</span>
        </div>
      </aside>
      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar-location">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
            <CurrentIcon size={17} aria-hidden="true" />
            <span>{destination.label}</span>
          </div>
          <button
            type="button"
            className="privacy-link"
            onClick={() => navigate('settings')}
          >
            <ShieldCheck size={15} aria-hidden="true" />
            <span>AI {aiEnabled ? 'enabled' : 'off'}</span>
            <ChevronsUpDown size={13} aria-hidden="true" />
          </button>
        </header>
        <main id="main-content" className="main-content">
          <div className="page-heading">
            <div>
              <h1 ref={headingRef} tabIndex={-1}>
                {activeTab === 'dashboard'
                  ? 'Today'
                  : activeTab === 'habits'
                    ? 'Your habits'
                    : destination.label}
              </h1>
              <p className="muted">
                {activeTab === 'dashboard'
                  ? parseDateKey(today).toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : activeTab === 'habits'
                    ? 'Simple routines, with a clear record of your progress.'
                    : activeTab === 'calendar'
                      ? 'A day-by-day view of your check-ins.'
                      : activeTab === 'statistics'
                        ? 'Your progress, measured from local history.'
                        : activeTab === 'insights'
                          ? 'Understand consistency and changes in your routines.'
                          : activeTab === 'settings'
                            ? 'Manage AI sharing and your local data.'
                            : 'Keep a backup of your habits and completion history.'}
              </p>
            </div>
            {['dashboard', 'habits'].includes(activeTab) && (
              <button
                className="btn btn-primary"
                onClick={() => setAddOpen(true)}
              >
                <Plus size={18} aria-hidden="true" />
                Add habit
              </button>
            )}
          </div>
          {(habitStorageError || completionStorageError || preferenceError) && (
            <p role="alert" className="status-note status-error">
              {habitStorageError || completionStorageError || preferenceError}
            </p>
          )}
          <div className="sr-only" role="status" aria-live="polite">
            {notice}
          </div>
          {['dashboard', 'habits'].includes(activeTab) &&
            aiEnabled &&
            habits.length > 0 && (
              <div className="status-note prediction-notice" role="status">
                <span>
                  {predictions.loading
                    ? 'Loading predictions for tomorrow. You can keep checking in.'
                    : predictions.error
                      ? `${predictions.error} Local tracking and charts are available.`
                      : 'Predictions for tomorrow are up to date.'}
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={predictions.retry}
                  disabled={predictions.loading}
                >
                  {predictions.loading
                    ? 'Loading predictions…'
                    : predictions.error
                      ? 'Retry predictions'
                      : 'Refresh predictions'}
                </button>
              </div>
            )}
          {activeTab === 'dashboard' && (
            <>
              <ProgressBar completed={completed} total={due.length} />
              <div className="dashboard-grid">
                <HabitList {...listProps} />
                <WeeklyOverview
                  habits={habits}
                  completions={completions}
                  today={today}
                  onOpenInsights={() => navigate('insights')}
                  onOpenSettings={() => navigate('settings')}
                  aiEnabled={aiEnabled}
                />
              </div>
            </>
          )}
          {activeTab === 'habits' && <HabitList {...listProps} management />}
          {activeTab === 'calendar' && (
            <CalendarView
              habits={habits}
              completions={completions}
              today={today}
            />
          )}
          {activeTab === 'statistics' && (
            <Suspense fallback={<ReportSkeleton statistics />}>
              <StatisticsDashboard
                habits={habits}
                completions={completions}
                today={today}
              />
            </Suspense>
          )}
          {activeTab === 'insights' && (
            <Suspense fallback={<ReportSkeleton />}>
              <InsightsDashboard
                habits={habits}
                completions={completions}
                today={today}
                predictions={predictions.results}
                aiEnabled={aiEnabled}
                predictionLoading={predictions.loading}
                predictionError={predictions.error}
                onRetryPredictions={predictions.retry}
              />
            </Suspense>
          )}
          {activeTab === 'data' && (
            <DataExport
              habits={habits}
              completions={completions}
              onImport={replaceData}
              onClear={() => replaceData([], {})}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel
              aiEnabled={aiEnabled}
              onAiToggle={toggleAi}
              onLoadDemo={loadDemoData}
              habits={habits}
              completions={completions}
              onImport={replaceData}
              onClear={() => replaceData([], {})}
              today={today}
            />
          )}
          <footer className="content-footer">
            <span>Habit Tracker</span>
            <span>Behaviour Insights & AI Coach</span>
          </footer>
        </main>
      </div>
      <Dialog
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title="Habit Tracker"
        className="navigation-dialog"
      >
        {navigation}
        <p className="drawer-note">
          <ShieldCheck size={16} aria-hidden="true" />
          Stored in your browser
        </p>
      </Dialog>
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add habit"
        description="Choose a routine you want to track each day."
      >
        <AddHabitForm
          onAddHabit={addHabit}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>
    </div>
  );
}

function ReportSkeleton({ statistics = false }) {
  return (
    <div
      className={`report-skeleton ${statistics ? 'statistics-skeleton' : ''}`}
      role="status"
      aria-label="Loading local report"
    >
      <div className="skeleton-heading" />
      <div className="skeleton-chart-row">
        <div className="panel skeleton-chart" />
        {!statistics && <div className="panel skeleton-chart" />}
      </div>
      <span className="sr-only">Loading local report…</span>
    </div>
  );
}

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ChartColumn,
  ChartNoAxesCombined,
  ChevronsUpDown,
  Database,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import useLocalDate from './hooks/useLocalDate';
import usePredictions, { clearPredictionCache } from './hooks/usePredictions';
import {
  clearAuthSession,
  getCurrentUser,
  readAuthSession,
  saveAuthSession,
} from './services/authApi';
import {
  clearAccountData,
  createHabit,
  deleteHabit,
  importHabits,
  loadAccountData,
  setCheckIn,
  updateAiPreference,
  updateHabit,
} from './services/habitApi';
import AuthPage from './components/AuthPage';
import AddHabitForm from './components/AddHabitForm';
import HabitList from './components/HabitList';
import ProgressBar from './components/ProgressBar';
import OverviewMetrics from './components/OverviewMetrics';
import CalendarView from './components/CalendarView';
import ActivityCalendar from './components/ActivityCalendar';
import DataExport from './components/DataExport';
import SettingsPanel from './components/SettingsPanel';
import WeeklyOverview from './components/WeeklyOverview';
import Dialog from './components/Dialog';
import { isEligibleDay, parseDateKey } from './utils/insights';
import { APP_URL, HOME_URL, replacePage, resolvePage } from './utils/routes';
import { buildActivitySummary } from './utils/activity';
import './stitch-theme.css';

const StatisticsDashboard = lazy(
  () => import('./components/StatisticsDashboard')
);
const InsightsDashboard = lazy(() => import('./components/InsightsDashboard'));
const LandingPage = lazy(() => import('./landing/LandingPage'));

const destinations = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'habits', label: 'My habits', icon: ListChecks },
  { id: 'calendar', label: 'Activity', icon: CalendarDays },
  { id: 'statistics', label: 'Statistics', icon: ChartColumn },
  { id: 'insights', label: 'Insights', icon: ChartNoAxesCombined },
  { id: 'settings', label: 'Settings', icon: Settings },
];
const testingDestination = { id: 'data', label: 'Testing tools', icon: Database };

export default function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  useEffect(() => {
    const updatePath = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', updatePath);
    return () => window.removeEventListener('popstate', updatePath);
  }, []);
  const page = resolvePage(pathname);
  if (page === 'landing') {
    return <Suspense fallback={<main className="route-loading" role="status">Opening Habit Tracker…</main>}><LandingPage /></Suspense>;
  }
  return <AccountApp testingRoute={page === 'testing'} />;
}

function AccountApp({ testingRoute }) {
  const [session, setSession] = useState(readAuthSession);
  const [authChecking, setAuthChecking] = useState(() => session !== null);
  const accessToken = session?.access_token;

  useEffect(() => {
    if (!accessToken) {
      setAuthChecking(false);
      return undefined;
    }

    let active = true;
    setAuthChecking(true);
    getCurrentUser(accessToken)
      .then((user) => {
        if (!active) return;
        const current = readAuthSession();
        if (current?.access_token !== accessToken) return;
        const nextSession = { ...current, user };
        saveAuthSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        if (active) {
          clearAuthSession();
          setSession((current) =>
            current?.access_token === accessToken ? null : current
          );
        }
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  if (authChecking) {
    return (
      <main className="auth-page">
        <p role="status">Checking your sign-in…</p>
      </main>
    );
  }
  if (!session) {
    return <AuthPage onAuthenticated={(nextSession) => {
      replacePage(APP_URL);
      setSession(nextSession);
    }} />;
  }
  return (
    <HabitTrackerApp
      session={session}
      testingRoute={testingRoute}
      onSessionUpdated={(user) =>
        setSession((current) => ({ ...current, user }))
      }
      onLogout={() => {
        clearAuthSession();
        clearPredictionCache();
        setSession(null);
        replacePage(HOME_URL);
      }}
    />
  );
}

function HabitTrackerApp({ session, testingRoute, onSessionUpdated, onLogout }) {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [aiEnabled, setAiEnabled] = useState(session.user.ai_enabled);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [workspaceTab, setActiveTab] = useState('dashboard');
  const activeTab = testingRoute ? 'data' : workspaceTab;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [dataRevision, setDataRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const headingRef = useRef(null);
  const today = useLocalDate(session.user.timezone);
  useEffect(() => {
    let active = true;
    setDataLoading(true);
    setDataError('');
    loadAccountData(session.access_token)
      .then((data) => {
        if (!active) return;
        setHabits(data.habits);
        setCompletions(data.completions);
      })
      .catch((error) => {
        if (active) setDataError(error.message);
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.access_token, reloadToken]);
  const predictions = usePredictions({
    token: session.access_token,
    habits,
    enabled: aiEnabled,
    active: ['dashboard', 'habits', 'insights'].includes(activeTab),
    revision: dataRevision,
  });
  const destination = activeTab === 'data' ? testingDestination : destinations.find((tab) => tab.id === activeTab);
  const CurrentIcon = destination.icon;
  const navigate = (id) => {
    if (testingRoute) replacePage(APP_URL);
    setActiveTab(id);
    setMobileNavOpen(false);
    setNotice('');
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const addHabit = async (values) => {
    try {
      const habit = await createHabit(session.access_token, values);
      setHabits((current) => [...current, habit]);
      setDataRevision((value) => value + 1);
      setAddOpen(false);
      setNotice('Habit added.');
    } catch (error) {
      setDataError(error.message);
    }
  };
  const editHabit = async (id, values) => {
    try {
      const habit = await updateHabit(session.access_token, id, values);
      setHabits((current) =>
        current.map((item) => (item.id === id ? habit : item))
      );
      setDataRevision((value) => value + 1);
      setNotice('Habit updated.');
    } catch (error) {
      setDataError(error.message);
    }
  };
  const removeHabit = async (id) => {
    try {
      await deleteHabit(session.access_token, id);
      setHabits((current) => current.filter((habit) => habit.id !== id));
      setCompletions((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setDataRevision((value) => value + 1);
      setNotice('Habit deleted.');
      headingRef.current?.focus();
    } catch (error) {
      setDataError(error.message);
    }
  };
  const toggleComplete = async (id) => {
    if (
      !habits.some(
        (habit) => habit.id === id && isEligibleDay(habit, today, today)
      )
    )
      return;
    const completedToday = (completions[id] || []).includes(today);
    try {
      await setCheckIn(
        session.access_token,
        id,
        today,
        !completedToday
      );
      setCompletions((current) => {
        const history = current[id] || [];
        return {
          ...current,
          [id]: completedToday
            ? history.filter((day) => day !== today)
            : [...history, today],
        };
      });
      setDataRevision((value) => value + 1);
    } catch (error) {
      setDataError(error.message);
    }
  };
  const importData = async (nextHabits, nextCompletions) => {
    try {
      await importHabits(session.access_token, nextHabits, nextCompletions);
      setReloadToken((value) => value + 1);
      setNotice('Backup habits imported to your account.');
    } catch (error) {
      setDataError(error.message);
      throw error;
    }
  };
  const clearData = async () => {
    try {
      await clearAccountData(session.access_token);
      setHabits([]);
      setCompletions({});
      setDataRevision((value) => value + 1);
      setNotice('All account habits and check-ins have been deleted.');
    } catch (error) {
      setDataError(error.message);
      setReloadToken((value) => value + 1);
      throw error;
    }
  };
  const toggleAi = async (value) => {
    try {
      const user = await updateAiPreference(session.access_token, value);
      const nextSession = { ...session, user };
      saveAuthSession(nextSession);
      onSessionUpdated(user);
      setAiEnabled(user.ai_enabled);
    } catch (error) {
      setDataError(error.message);
    }
  };
  const due = habits.filter((habit) => isEligibleDay(habit, today, today));
  const completed = due.filter((habit) =>
    (completions[habit.id] || []).includes(today)
  ).length;
  const activitySummary = useMemo(() => buildActivitySummary(habits, completions, today), [habits, completions, today]);
  const listProps = {
    habits,
    completions,
    predictions: predictions.results,
    aiEnabled,
    today,
    onToggleComplete: toggleComplete,
    onEditHabit: editHabit,
    onDeleteHabit: removeHabit,
    onAddHabit: () => setAddOpen(true),
  };
  const navigation = (
    <nav aria-label="Main navigation">
      {destinations.map((tab, index) => {
        const { id, label } = tab;
        const Icon = tab.icon;
        return (
          <div key={id} className={id === 'settings' ? 'nav-bottom' : undefined}>
          {(index === 0 || id === 'statistics') && <p className="nav-group-label">{index === 0 ? 'Workspace' : 'Progress'}</p>}
          <button
            type="button"
            className={`nav-item ${id === activeTab ? 'active' : ''} ${id === 'settings' ? 'nav-settings' : ''}`}
            aria-current={id === activeTab ? 'page' : undefined}
            onClick={() => navigate(id)}
          >
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </button>
          </div>
        );
      })}
    </nav>
  );

  if (dataLoading) {
    return (
      <main className="auth-page">
        <p role="status">Loading your account data…</p>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="sidebar">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
        >
          <span className="brand-mark">
            <Sprout size={24} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span>
            Habit Tracker
          </span>
        </a>
        <div className="sidebar-profile">
          <span className="account-avatar" aria-hidden="true">{(session.user.display_name || session.user.email).slice(0, 1).toUpperCase()}</span>
          <div><strong>{session.user.display_name || 'Your workspace'}</strong><span>{session.user.email}</span></div>
        </div>
        {navigation}
        <div className="sidebar-sync"><ShieldCheck size={16} aria-hidden="true" /><span>Personal workspace</span></div>
      </header>
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
            <span>{activeTab === 'dashboard' ? `Welcome${session.user.display_name ? `, ${session.user.display_name.split(' ')[0]}` : ' back'}` : 'Workspace'}</span><span className="breadcrumb-divider">/</span><strong>{destination.label}</strong>
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
          <div className="account-actions">
            <span className="account-email">{session.user.email}</span>
            <button
              type="button"
              className="text-button"
              onClick={() => setLogoutOpen(true)}
            >
              <LogOut size={15} aria-hidden="true" />
              Log out
            </button>
          </div>
        </header>
        <main id="main-content" className={`main-content main-content-${activeTab}`}>
          <div className="page-heading">
            <div>
              <p className="page-kicker">
                {activeTab === 'dashboard'
                  ? parseDateKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
                  : 'Personal workspace'}
              </p>
              <div className="page-title">
              <span className="page-title-icon"><CurrentIcon size={23} strokeWidth={1.7} aria-hidden="true" /></span>
              <h1 ref={headingRef} tabIndex={-1}>
                {activeTab === 'dashboard'
                  ? 'Today'
                  : activeTab === 'habits'
                    ? 'Your habits'
                    : destination.label}
              </h1>
              </div>
              <p className="muted">
                {activeTab === 'dashboard'
                  ? 'A little time for the things you want to keep doing.'
                  : activeTab === 'habits'
                    ? 'Your routines, schedules, and daily check-ins.'
                    : activeTab === 'calendar'
                      ? 'See when you showed up. Select a date to look a little closer.'
                      : activeTab === 'statistics'
                          ? 'A clear picture of your progress, built from your check-ins.'
                        : activeTab === 'insights'
                          ? 'Notice your patterns and find a routine that works for you.'
                          : activeTab === 'settings'
                            ? 'Your notification and AI preferences, in one place.'
                            : 'Import and export account backups for testing. These tools are only available at this address.'}
              </p>
            </div>
            {['dashboard', 'habits'].includes(activeTab) && (
              <div className="page-actions">
                {aiEnabled && habits.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={predictions.retry}
                    disabled={predictions.loading}
                  >
                    <RefreshCw
                      size={16}
                      className={predictions.loading ? 'spin-icon' : undefined}
                      aria-hidden="true"
                    />
                    {predictions.loading
                      ? 'Loading predictions…'
                      : predictions.error
                        ? 'Retry predictions'
                        : 'Refresh predictions'}
                  </button>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus size={18} aria-hidden="true" />
                  Add habit
                </button>
              </div>
            )}
          </div>
          {dataError && (
            <p role="alert" className="status-note status-error">
              {dataError}{' '}
              <button
                type="button"
                className="text-button"
                onClick={() => setReloadToken((value) => value + 1)}
              >
                Retry
              </button>
            </p>
          )}
          <div className="sr-only" role="status" aria-live="polite">
            {notice}
          </div>
          <div className={`page-content page-content-${activeTab}`} role="region" aria-label={`${destination.label} content`} tabIndex={activeTab === 'habits' ? -1 : 0}>
          {['dashboard', 'habits'].includes(activeTab) &&
            aiEnabled &&
            habits.length > 0 && (
              <div className="status-note prediction-notice" role="status">
                <span>
                  {predictions.loading
                    ? 'Loading risk estimates for the next 3 days.'
                    : predictions.error
                      ? predictions.error
                      : 'Risk estimates are up to date.'}
                </span>
              </div>
            )}
          {activeTab === 'dashboard' && (
            <>
              <OverviewMetrics totalHabits={habits.length} dueToday={due.length} completedToday={completed} currentStreak={activitySummary.currentStreak} />
              <div className="dashboard-grid dashboard-reference-grid">
                <div className="dashboard-primary">
                <ProgressBar completed={completed} total={due.length} />
                <HabitList {...listProps} />
                </div>
                <WeeklyOverview
                  habits={habits}
                  completions={completions}
                  today={today}
                  onOpenInsights={() => navigate('insights')}
                  onOpenSettings={() => navigate('settings')}
                  aiEnabled={aiEnabled}
                />
              </div>
              <ActivityCalendar habits={habits} completions={completions} today={today} />
            </>
          )}
          {activeTab === 'habits' && <HabitList {...listProps} management />}
          {activeTab === 'calendar' && (
            <div className="stack">
            <ActivityCalendar habits={habits} completions={completions} today={today} />
            <CalendarView
              habits={habits}
              completions={completions}
              today={today}
            />
            </div>
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
          {activeTab === 'data' && testingRoute && (
            <DataExport
              habits={habits}
              completions={completions}
              onImport={importData}
              onClear={clearData}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsPanel
              token={session.access_token}
              aiEnabled={aiEnabled}
              onAiToggle={toggleAi}
            />
          )}
          </div>
          <footer className="content-footer">
            <span>Habit Tracker</span>
            <span><ShieldCheck size={14} aria-hidden="true" /> Your habits sync to your account</span>
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
          Synced to your account
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
      <Dialog
        open={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        title="Log out?"
        description="You can sign back in to access your account habits."
      >
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            data-autofocus
            onClick={() => setLogoutOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function ReportSkeleton({ statistics = false }) {
  return (
    <div
      className={`report-skeleton ${statistics ? 'statistics-skeleton' : ''}`}
      role="status"
      aria-label="Loading report"
    >
      <div className="skeleton-heading" />
      <div className="skeleton-chart-row">
        <div className="panel skeleton-chart" />
        {!statistics && <div className="panel skeleton-chart" />}
      </div>
      <span className="sr-only">Loading report…</span>
    </div>
  );
}

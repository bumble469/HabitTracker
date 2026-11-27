import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { login, register, saveAuthSession } from '../services/authApi';
import { isValidSignupPassword, passwordRequirements } from '../utils/password';
import './AuthPage.css';

function localTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState(() =>
    ['auth', 'mode'].some((key) => new URLSearchParams(window.location.search).get(key) === 'register')
      ? 'register'
      : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordRejected, setPasswordRejected] = useState(false);
  const formScrollRef = useRef(null);
  const isRegistering = mode === 'register';
  const requirements = passwordRequirements(password);
  const fulfilledRequirements = requirements.filter(({ met }) => met).length;

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setPasswordRejected(false);
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (formScrollRef.current) formScrollRef.current.scrollTop = 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setPasswordRejected(false);
    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (isRegistering && !isValidSignupPassword(password)) {
      setError('Password must contain at least 8 characters, a capital letter, a number, and a symbol.');
      setPasswordRejected(true);
      event.currentTarget.elements.namedItem('password')?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const session = isRegistering
        ? await register({
            email: email.trim(),
            password,
            display_name: displayName.trim(),
            timezone: localTimezone(),
          })
        : await login({ email: email.trim(), password });
      saveAuthSession(session);
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-unified">
      <header className="auth-masthead">
        <a className="auth-brand" href={import.meta.env.BASE_URL} aria-label="Habit Tracker home">
          <span className="brand-mark">
            <Check size={24} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span>Habit Tracker</span>
        </a>
        <a className="auth-edition" href={import.meta.env.BASE_URL}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to website
        </a>
      </header>
      <div className="auth-spread">
        <aside className="auth-editorial" aria-labelledby="auth-editorial-title">
          <p className="auth-eyebrow">A little, every day.</p>
          <h2 id="auth-editorial-title">Make room for<br />what matters.</h2>
          <div className="auth-illustration">
            <img
              src={`${import.meta.env.BASE_URL}landing/media/auth-visual.svg`}
              alt="An illustrated habit plan with space for reading, movement, and a moment to pause."
              width="560"
              height="390"
            />
          </div>
          <p className="auth-editorial-intro">Plan your routines. Check in at your pace.<br />See the progress you make along the way.</p>
          <span className="auth-illustration-caption">Illustrated example · your journey starts with you</span>
        </aside>
        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card-heading">
            <p className="auth-eyebrow">Your personal workspace</p>
            <h1 id="auth-title">
              {isRegistering ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="auth-intro">
              {isRegistering
                ? 'A few details, then your first small step.'
                : 'Sign in to continue to your habits.'}
            </p>
          </div>

          <fieldset className="auth-mode-selector" disabled={submitting}>
            <legend className="sr-only">Account access</legend>
            <label>
              <input
                id="login-tab"
                type="radio"
                name="account_mode"
                value="login"
                checked={!isRegistering}
                aria-controls="auth-form"
                onChange={() => changeMode('login')}
              />
              <span>Log in</span>
            </label>
            <label>
              <input
                id="register-tab"
                type="radio"
                name="account_mode"
                value="register"
                checked={isRegistering}
                aria-controls="auth-form"
                onChange={() => changeMode('register')}
              />
              <span>Sign up</span>
            </label>
          </fieldset>

          <div className="auth-form-scroll" ref={formScrollRef} role="region" aria-label={isRegistering ? 'Sign-up details' : 'Login details'} tabIndex={0}>
            <form id="auth-form" className="auth-form" onSubmit={handleSubmit}>
              {isRegistering && (
                <label>
                  Name
                  <input
                    autoComplete="name"
                    maxLength={100}
                    name="display_name"
                    placeholder="Your name"
                    onChange={(event) => setDisplayName(event.target.value)}
                    required
                    value={displayName}
                  />
                </label>
              )}
              <label>
                Email
                <input
                  autoComplete="email"
                  maxLength={254}
                  name="email"
                  placeholder="you@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>
              <label>
                Password
                <span className="auth-password-control">
                  <input
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    maxLength={128}
                    minLength={isRegistering ? 8 : undefined}
                    name="password"
                    placeholder={isRegistering ? 'Create a strong password' : 'Enter your password'}
                    aria-describedby={isRegistering ? 'password-requirements' : undefined}
                    aria-invalid={passwordRejected || undefined}
                    aria-errormessage={passwordRejected ? 'auth-error' : undefined}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setPasswordRejected(false);
                    }}
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((shown) => !shown)}
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </span>
              </label>
              {isRegistering && (
                <div id="password-requirements" className="auth-password-requirements">
                  <p>Your password needs:</p>
                  <ul aria-label="Password requirements">
                    {requirements.map(({ id, label, met }) => (
                      <li key={id} data-met={met}>
                        <span className="auth-requirement-mark" aria-hidden="true">{met ? '✓' : '○'}</span>
                        <span>{label}<span className="sr-only">{met ? ' — met' : ' — still needed'}</span></span>
                      </li>
                    ))}
                  </ul>
                  <span className="sr-only" role="status" aria-live="polite">{fulfilledRequirements} of 4 password requirements met.</span>
                </div>
              )}
              {isRegistering && (
                <label>
                  Confirm password
                  <span className="auth-password-control">
                    <input
                      autoComplete="new-password"
                      maxLength={128}
                      name="confirm_password"
                      placeholder="Enter your password again"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      aria-label={
                        showConfirmPassword
                          ? 'Hide confirmation password'
                          : 'Show confirmation password'
                      }
                      aria-pressed={showConfirmPassword}
                      onClick={() =>
                        setShowConfirmPassword((shown) => !shown)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} aria-hidden="true" />
                      ) : (
                        <Eye size={18} aria-hidden="true" />
                      )}
                    </button>
                  </span>
                  {confirmPassword && password !== confirmPassword && (
                    <span className="auth-hint auth-validation" role="status">
                      Passwords do not match.
                    </span>
                  )}
                </label>
              )}
              {error && (
                <p id="auth-error" className="auth-error" role="alert">
                  {error}
                </p>
              )}
            </form>
          </div>

          <div className="auth-card-footer">
            <button className="btn btn-primary auth-submit" type="submit" form="auth-form" disabled={submitting}>
              {submitting
                ? 'Please wait…'
                : isRegistering
                  ? 'Create account'
                  : 'Log in'}
              {!submitting && <ArrowRight size={17} aria-hidden="true" />}
            </button>

            <p className="auth-footnote">
              <ShieldCheck size={14} aria-hidden="true" />
              Your habits, saved to your personal account.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

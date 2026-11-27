import { useRef, useState } from 'react';
import { Sprout, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { detectedTimezone, timezoneOptions } from '../data/timezones';
import BotanicalArt from './BotanicalArt';
import './AccountIntegration.css';

export default function AuthScreen() {
  const { login, register, error: sessionError } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [values, setValues] = useState({
    email: '',
    password: '',
    display_name: '',
    timezone: detectedTimezone(),
  });
  const [failure, setFailure] = useState(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const change = (name) => (event) => {
    setValues((previous) => ({ ...previous, [name]: event.target.value }));
    setFailure(null);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setFailure(null);
    try {
      if (registering) await register(values);
      else await login({ email: values.email, password: values.password });
    } catch (error) {
      setFailure(error);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const fieldError = (name) =>
    failure?.fields?.[name] ? (
      <p className="field-error" id={`auth-${name}-error`}>
        {failure.fields[name]}
      </p>
    ) : null;
  return (
    <main className="auth-page">
      <aside className="auth-story" aria-label="A little better, every day">
        <div className="auth-story-brand">
          <span className="brand-mark"><Sprout size={25} aria-hidden="true" /></span>
          <strong>Habit Tracker<span>A little better, every day.</span></strong>
        </div>
        <div className="auth-story-copy">
          <p className="auth-story-eyebrow">GOOD THINGS TAKE PRACTICE</p>
          <h2>Small steps.<br /><em>Lasting change.</em></h2>
          <p>A calmer space to build your routines,<br />notice your progress, and keep growing.</p>
        </div>
        <BotanicalArt className="auth-botanical" />
        <div className="auth-story-footer"><span>Growth happens one day at a time.</span><ArrowUpRight size={19} aria-hidden="true" /></div>
      </aside>
      <div className="auth-form-area">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark"><Sprout size={23} aria-hidden="true" /></span>
          <strong>Habit Tracker</strong>
        </div>
        <p className="eyebrow auth-eyebrow">YOUR DAILY PRACTICE</p>
        <h1>{registering ? 'Create your account' : 'Welcome back'}</h1>
        <p className="muted">
          {registering
            ? 'A fresh start for the routines that matter to you.'
            : 'A little progress starts with showing up. Let’s begin.'}
        </p>
        <form className="account-form" onSubmit={submit}>
          <div className="field">
            <label className="field-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              maxLength={254}
              value={values.email}
              onChange={change('email')}
              aria-invalid={Boolean(failure?.fields?.email)}
              aria-describedby={
                failure?.fields?.email ? 'auth-email-error' : undefined
              }
            />
            {fieldError('email')}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="input"
              type="password"
              placeholder={registering ? 'Choose a password' : 'Enter your password'}
              autoComplete={registering ? 'new-password' : 'current-password'}
              required
              minLength={registering ? 8 : undefined}
              maxLength={128}
              value={values.password}
              onChange={change('password')}
              aria-invalid={Boolean(failure?.fields?.password)}
              aria-describedby={
                failure?.fields?.password ? 'auth-password-error' : undefined
              }
            />
            {fieldError('password')}
            {registering && <p className="form-hint">Use 8–128 characters.</p>}
          </div>
          {registering && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="auth-display_name">
                  Display name (optional)
                </label>
                <input
                  id="auth-display_name"
                  className="input"
                  autoComplete="nickname"
                  maxLength={100}
                  value={values.display_name}
                  onChange={change('display_name')}
                />
                {fieldError('display_name')}
              </div>
              <div className="field">
                <label className="field-label" htmlFor="auth-timezone">
                  Account timezone
                </label>
                <select
                  id="auth-timezone"
                  className="input"
                  value={values.timezone}
                  onChange={change('timezone')}
                >
                  {timezoneOptions(values.timezone).map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
                <p className="form-hint">
                  Your daily check-ins use this timezone.
                </p>
                {fieldError('timezone')}
              </div>
            </>
          )}
          {(failure || sessionError) && (
            <p className="status-note status-error" role="alert">
              {failure?.message || sessionError}
            </p>
          )}
          <button className="btn btn-primary" disabled={pending}>
            {pending
              ? 'Please wait…'
              : registering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        <button
          className="btn btn-secondary auth-alternate"
          disabled={pending}
          onClick={() => {
            setRegistering((value) => !value);
            setFailure(null);
            setValues((current) => ({ ...current, password: '' }));
          }}
        >
          {registering
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </button>
        <p className="auth-form-footer">Your habits. Your pace. Your progress.</p>
      </section>
      </div>
    </main>
  );
}

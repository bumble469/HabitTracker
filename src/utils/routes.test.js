import { describe, expect, it } from 'vitest';
import { resolvePage } from './routes';

describe('public and account entry routes', () => {
  it.each(['/', '/index.html', '/landing.html', '/landing/', '/Habit-Tracker-Web-App', '/Habit-Tracker-Web-App/', '/Habit-Tracker-Web-App/index.html', '/Habit-Tracker-Web-App/landing.html'])('shows the public landing page at %s', (path) => {
    expect(resolvePage(path, '/Habit-Tracker-Web-App/')).toBe('landing');
  });
  it.each(['/app', '/app/', '/app/index.html', '/Habit-Tracker-Web-App/app', '/Habit-Tracker-Web-App/app/'])('opens the workspace at %s', (path) => {
    expect(resolvePage(path, '/Habit-Tracker-Web-App/')).toBe('app');
  });
  it.each(['/pratik', '/pratik/', '/Habit-Tracker-Web-App/pratik', '/Habit-Tracker-Web-App/pratik/index.html'])('keeps tools limited to deliberate testing entry %s', (path) => {
    expect(resolvePage(path, '/Habit-Tracker-Web-App/')).toBe('testing');
  });
  it('does not interpret unrelated paths containing app or pratik as authenticated entries', () => {
    expect(resolvePage('/other/pratik', '/Habit-Tracker-Web-App/')).toBe('landing');
    expect(resolvePage('/application', '/')).toBe('landing');
    expect(resolvePage('/app', '/')).toBe('app');
  });
});

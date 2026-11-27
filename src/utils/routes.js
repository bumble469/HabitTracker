export const HOME_URL = import.meta.env.BASE_URL;
export const APP_URL = `${HOME_URL}app`;

export function resolvePage(pathname, baseUrl = HOME_URL) {
  const base = `/${baseUrl.replace(/^\/+|\/+$/g, '')}`;
  let path = pathname.replace(/\/+$/, '') || '/';
  // Accept the established Pages mount as well as root-hosted local previews.
  const mount = [base, '/Habit-Tracker-Web-App'].find((candidate) =>
    candidate !== '/' && (path === candidate || path.startsWith(`${candidate}/`))
  );
  if (mount) {
    path = path.slice(mount.length) || '/';
  }
  path = path.replace(/\/index\.html$/, '') || '/';
  if (path === '/app') return 'app';
  if (path === '/pratik') return 'testing';
  return 'landing';
}

export function replacePage(url) {
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

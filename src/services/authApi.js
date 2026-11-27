export const AUTH_SESSION_KEY = 'habitTracker.authSession';

function apiBaseUrl() {
  const configured = (
    import.meta.env.VITE_API_BASE_URL || ''
  ).trim().replace(/\/+$/, '');
  try {
    const url = new URL(configured);
    return ['http:', 'https:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
      ? configured
      : '';
  } catch {
    return '';
  }
}

async function request(path, options = {}) {
  const baseUrl = apiBaseUrl();
  if (!baseUrl)
    throw new Error('Set VITE_API_BASE_URL to your backend URL and restart Vite.');

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      'Could not reach the backend. Check that it is running at the configured URL.'
    );
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('The backend returned an invalid response.');
  }

  if (!response.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((issue) => issue.msg).join(', ')
      : data.detail;
    throw new Error(detail || `Request failed (HTTP ${response.status}).`);
  }
  return data;
}

export function login(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function register(details) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
}

export function getCurrentUser(token) {
  return request('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function readAuthSession() {
  try {
    const value = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY));
    if (
      typeof value?.access_token === 'string' &&
      value.access_token.length > 0 &&
      value.user
    )
      return value;
  } catch {
    // An invalid or unavailable session should require signing in again.
  }
  return null;
}

export function saveAuthSession(session) {
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

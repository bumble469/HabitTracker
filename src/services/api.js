/** The browser stores only an access token. All account records come from FastAPI. */
let sessionToken = null;
let unauthorizedHandler = null;
let sessionGeneration = 0;
const requests = new Set();

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, detail = null, fieldErrors = {}, kind = 'http' } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
    this.fields = fieldErrors;
    this.kind = kind;
  }
}

export function getApiBaseUrl() {
  const configured = (
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  ).trim();
  try {
    const url = new URL(configured);
    // Accept an accidental /api suffix, but never append /api twice.
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      !['', '/', '/api', '/api/'].includes(url.pathname) ||
      url.search ||
      url.hash
    )
      throw new Error('Invalid origin');
    return url.origin;
  } catch {
    throw new ApiError(
      'Set VITE_API_BASE_URL to the backend origin, for example http://localhost:8000.',
      { kind: 'configuration' }
    );
  }
}

export function cancelAllRequests() {
  for (const controller of requests) controller.abort();
  requests.clear();
}

export function setSessionToken(token, onUnauthorized = null) {
  if (token !== sessionToken) {
    sessionGeneration += 1;
    cancelAllRequests();
  }
  sessionToken = token;
  unauthorizedHandler = onUnauthorized;
}

function readableError(payload, status) {
  const detail = payload && typeof payload === 'object' ? payload.detail : null;
  if (typeof detail === 'string') return { message: detail, detail };
  if (Array.isArray(detail)) {
    const fieldErrors = {};
    const messages = detail.map((item) => {
      const path = Array.isArray(item.loc)
        ? item.loc
            .filter((part) => !['body', 'query', 'path'].includes(part))
            .join('.')
        : '';
      const message = typeof item.msg === 'string' ? item.msg : 'Invalid value';
      if (path) fieldErrors[path] = message;
      return path ? `${path}: ${message}` : message;
    });
    return {
      message: messages.join('; ') || 'Please check the supplied values.',
      detail,
      fieldErrors,
    };
  }
  const plain =
    typeof payload === 'string' && !/<[^>]+>/.test(payload)
      ? payload.trim().slice(0, 300)
      : '';
  return {
    message:
      plain ||
      (status >= 500
        ? `The backend is unavailable (HTTP ${status}). Please try again.`
        : `Request failed (HTTP ${status}).`),
    detail,
  };
}

/** No automatic retries: import, demo creation and coach sends are not idempotent. */
export async function api(path, options = {}) {
  const {
    method = 'GET',
    body,
    signal,
    auth = true,
    token,
    timeoutMs = 20000,
  } = options;
  const base = getApiBaseUrl();
  const currentToken = token === undefined ? sessionToken : token;
  const generation = sessionGeneration;
  const onUnauthorized = unauthorizedHandler;
  if (auth && !currentToken) {
    onUnauthorized?.();
    throw new ApiError('Not authenticated', { status: 401 });
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort, { once: true });
  if (controller.signal.aborted)
    throw new DOMException('Request cancelled', 'AbortError');
  requests.add(controller);
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const cancelled = new Promise((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () =>
        reject(
          timedOut
            ? new ApiError(
                'The backend request timed out. Check the connection before trying again.',
                { kind: 'network' }
              )
            : new DOMException('Request cancelled', 'AbortError')
        ),
      { once: true }
    );
  });
  const work = async () => {
    const headers = { Accept: 'application/json' };
    if (auth && currentToken) headers.Authorization = `Bearer ${currentToken}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${base}/${path.replace(/^\/+/, '')}`, {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (controller.signal.aborted)
      throw new DOMException('Request cancelled', 'AbortError');
    if (response.status === 204 && response.ok) return undefined;
    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      if (response.ok)
        throw new ApiError(
          'The backend returned invalid JSON. Please try again.',
          { kind: 'response', status: response.status }
        );
      payload = raw;
    }
    if (!response.ok) {
      const error = new ApiError(
        readableError(payload, response.status).message,
        { status: response.status, ...readableError(payload, response.status) }
      );
      if (auth && response.status === 401 && generation === sessionGeneration) {
        requests.delete(controller);
        onUnauthorized?.();
      }
      throw error;
    }
    if (controller.signal.aborted || (auth && generation !== sessionGeneration))
      throw new DOMException('Request cancelled', 'AbortError');
    return payload;
  };
  try {
    return await Promise.race([work(), cancelled]);
  } catch (error) {
    if (error instanceof ApiError || error.name === 'AbortError') throw error;
    throw new ApiError(
      'Cannot connect to the backend. Check that it is running and that CORS_ORIGINS allows this frontend origin.',
      { kind: 'network' }
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    requests.delete(controller);
  }
}

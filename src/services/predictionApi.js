// All optional AI traffic passes through this gate. Habits remain browser-local
// until the user has explicitly opted in; no health probes run automatically.
const activeRequests = new Set();
const REQUEST_TIMEOUT_MS = 12000;
let explicitlyDisabled = false;

function abortError() {
  return new DOMException('AI request cancelled', 'AbortError');
}

export function isAiEnabled() {
  try {
    return (
      !explicitlyDisabled &&
      typeof window !== 'undefined' &&
      window.localStorage.getItem('aiEnabled') === 'true'
    );
  } catch {
    return false;
  }
}

export function setAiPreference(enabled) {
  // Persist synchronously so a queued worker cannot start between a toggle and
  // React's next render. Aborting cannot retract data already transmitted.
  explicitlyDisabled = true;
  try {
    window.localStorage.setItem('aiEnabled', JSON.stringify(enabled === true));
    explicitlyDisabled = enabled !== true;
    return true;
  } catch {
    // Storage failure must fail closed, including a failed attempt to opt out.
    return false;
  } finally {
    if (explicitlyDisabled)
      activeRequests.forEach((controller) => controller.abort());
  }
}

function apiBaseUrl() {
  const configured = (import.meta.env.VITE_API_BASE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  if (!configured) return '';
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

export function isApiConfigured() {
  return Boolean(apiBaseUrl());
}

export function validatePrediction(value) {
  if (
    !value ||
    !Number.isFinite(value.probability) ||
    value.probability < 0 ||
    value.probability > 1
  )
    return null;
  // Levels and explanations come from the backend, never browser thresholds.
  if (
    typeof value.level !== 'string' ||
    !value.level.trim() ||
    typeof value.reason !== 'string' ||
    !value.reason.trim()
  )
    return null;
  return {
    probability: value.probability,
    level: value.level,
    reason: value.reason,
  };
}

export async function requestAiJson(
  path,
  payload,
  { signal, timeoutMs = REQUEST_TIMEOUT_MS } = {}
) {
  if (!isAiEnabled()) throw abortError();
  if (signal?.aborted) throw abortError();
  const baseUrl = apiBaseUrl();
  if (!baseUrl) throw new Error('The prediction service is not configured.');

  const controller = new AbortController();
  activeRequests.add(controller);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  let timedOut = false;
  let rejectCancellation;
  const cancellation = new Promise((_, reject) => {
    rejectCancellation = reject;
  });
  const onAbort = () =>
    rejectCancellation(
      timedOut ? new Error('AI request timed out. Please retry.') : abortError()
    );
  controller.signal.addEventListener('abort', onAbort, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const operation = (async () => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(
          `AI unavailable (HTTP ${response.status}). Please retry.`
        );
      try {
        return await response.json();
      } catch {
        throw new Error('AI returned invalid JSON. Please retry.');
      }
    })();
    const data = await Promise.race([operation, cancellation]);
    if (!isAiEnabled() || controller.signal.aborted) throw abortError();
    return data;
  } catch (error) {
    if (controller.signal.aborted)
      throw timedOut
        ? new Error('AI request timed out. Please retry.')
        : abortError();
    if (error instanceof TypeError)
      throw new Error(
        'AI unavailable. Check the backend connection and retry.'
      );
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
    controller.signal.removeEventListener('abort', onAbort);
    activeRequests.delete(controller);
  }
}

export async function predictMissingTomorrow(payload, signal) {
  const data = await requestAiJson('/predict', payload, { signal });
  const prediction = validatePrediction(data);
  if (!prediction)
    throw new Error('AI returned a malformed prediction. Please retry.');
  return prediction;
}

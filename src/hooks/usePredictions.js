import { useEffect, useRef, useState } from 'react';
import { getRisk } from '../services/habitApi';

const CACHE_KEY = 'habit-tracker:risk-cache:v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Short non-reversible tag so the cache is only reused by the account that wrote it.
function fingerprint(token) {
  let hash = 5381;
  for (let i = 0; i < token.length; i += 1)
    hash = ((hash << 5) + hash + token.charCodeAt(i)) | 0;
  return String(hash >>> 0);
}

function readCache(token) {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (
      !cached ||
      cached.owner !== fingerprint(token) ||
      Date.now() - cached.savedAt > CACHE_TTL_MS ||
      typeof cached.results !== 'object'
    )
      return null;
    return cached.results;
  } catch {
    return null;
  }
}

function writeCache(token, results) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ owner: fingerprint(token), savedAt: Date.now(), results })
    );
  } catch {
    // Storage full or unavailable: the cache is only an optimisation.
  }
}

export function clearPredictionCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

function toResults(risk) {
  return Object.fromEntries(
    risk.map((item) => [
      item.habit_id,
      item.risk === null
        ? {
            unavailable: true,
            level: item.level,
            reason:
              item.reasons.join('; ') ||
              'This habit needs about two weeks of history before it can be scored.',
          }
        : {
            probability: item.risk,
            level: item.level,
            reason:
              item.reasons.join('; ') ||
              'The model found no elevated risk signals.',
          },
    ])
  );
}

/**
 * Risk predictions are fetched once on mount, then only when the refresh button
 * is used (retry) or a habit/check-in changes (revision). Switching tabs never
 * refetches, and the last result is cached in localStorage so a reload can show
 * it immediately while the single mount-time fetch runs.
 */
export default function usePredictions({
  token,
  habits,
  enabled,
  active = true,
  revision = 0,
}) {
  const [results, setResults] = useState(() =>
    enabled && token ? readCache(token) || {} : {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);
  const lastKeyRef = useRef(null);

  const hasHabits = habits.length > 0;
  // Everything that should trigger a fresh fetch. `active` is deliberately not part of it.
  const requestKey = [
    token,
    enabled,
    revision,
    retryToken,
    habits.map((habit) => habit.id).join(','),
  ].join('|');

  useEffect(() => {
    if (!enabled || !token) {
      lastKeyRef.current = null;
      setResults({});
      setLoading(false);
      setError(null);
      return undefined;
    }
    // Nothing to score, or the user is on a tab that doesn't show predictions.
    if (!hasHabits || !active) return undefined;
    // Already fetched for exactly this state: reuse it.
    if (lastKeyRef.current === requestKey) return undefined;

    lastKeyRef.current = requestKey;
    const controller = new AbortController();
    let current = true;
    let finished = false;
    setLoading(true);
    setError(null);
    getRisk(token, controller.signal)
      .then((risk) => {
        if (!current) return;
        const next = toResults(risk);
        setResults(next);
        writeCache(token, next);
      })
      .catch((requestError) => {
        if (current && requestError.name !== 'AbortError')
          setError(requestError.message);
      })
      .finally(() => {
        finished = true;
        if (current) setLoading(false);
      });

    return () => {
      current = false;
      controller.abort();
      // An interrupted request must be retried the next time predictions are shown.
      if (!finished) lastKeyRef.current = null;
    };
  }, [requestKey, active, enabled, token, hasHabits]);

  return {
    results,
    loading,
    error,
    retry: () => setRetryToken((value) => value + 1),
  };
}

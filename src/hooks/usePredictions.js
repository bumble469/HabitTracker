import { useEffect, useState } from 'react';
import {
  isAiEnabled,
  isApiConfigured,
  predictMissingTomorrow,
} from '../services/predictionApi';

const MAX_CONCURRENT = 3;

function validDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function localCreatedDate(habit, today) {
  const value = habit.createdAt || habit.created_on;
  if (typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value))
    return validDateKey(value) && value <= today ? value : null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const local = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return local <= today ? local : null;
}

export function predictionPayload(habit, completions, today) {
  const created = localCreatedDate(habit, today);
  return {
    habit_id: habit.id,
    created_on: created,
    today,
    completed_dates: [
      ...new Set(
        Array.isArray(completions[habit.id]) ? completions[habit.id] : []
      ),
    ]
      .filter(
        (date) =>
          validDateKey(date) && (!created || date >= created) && date <= today
      )
      .sort(),
  };
}

export default function usePredictions({
  habits,
  completions,
  today,
  enabled,
  active = true,
  revision = 0,
}) {
  const [state, setState] = useState({
    signature: '',
    results: {},
    loading: false,
    error: null,
  });
  const [retryToken, setRetryToken] = useState(0);
  // A value signature avoids repeated requests when equivalent arrays/objects
  // are reconstructed by a parent. Include habit metadata to invalidate edits.
  const signature = JSON.stringify({
    habits,
    payloads: habits.map((habit) =>
      predictionPayload(habit, completions, today)
    ),
    today,
    revision,
    retryToken,
  });
  const configured = isApiConfigured();

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const payloads = JSON.parse(signature).payloads;
    const cleanup = () => {
      cancelled = true;
      controller.abort();
    };
    if (
      !enabled ||
      !active ||
      !isAiEnabled() ||
      !configured ||
      payloads.length === 0
    ) {
      setState((current) =>
        current.signature
          ? { signature: '', results: {}, loading: false, error: null }
          : current
      );
      return cleanup;
    }

    const results = {};
    let nextIndex = 0;
    // Defer starting requests by one microtask. React StrictMode's rehearsal
    // cleanup cancels its run before it sends data, preventing duplicate POSTs.
    void Promise.resolve().then(async () => {
      if (cancelled || !isAiEnabled()) return;
      setState({ signature, results: {}, loading: true, error: null });
      const worker = async () => {
        while (!cancelled && isAiEnabled() && nextIndex < payloads.length) {
          const payload = payloads[nextIndex++];
          try {
            if (!payload.created_on)
              throw new Error(
                'This habit has no valid creation date. AI prediction is unavailable.'
              );
            const prediction = await predictMissingTomorrow(
              payload,
              controller.signal
            );
            if (cancelled || !isAiEnabled()) return;
            results[payload.habit_id] = prediction;
          } catch (error) {
            if (cancelled || !isAiEnabled() || error.name === 'AbortError')
              return;
            results[payload.habit_id] = {
              unavailable: true,
              reason: error.message,
            };
          }
          if (!cancelled)
            setState({
              signature,
              results: { ...results },
              loading: true,
              error: null,
            });
        }
      };
      await Promise.all(
        Array.from(
          { length: Math.min(MAX_CONCURRENT, payloads.length) },
          worker
        )
      );
      if (!cancelled && isAiEnabled())
        setState({
          signature,
          results: { ...results },
          loading: false,
          error: Object.values(results).some((result) => result.unavailable)
            ? 'Some predictions are unavailable.'
            : null,
        });
    });
    return cleanup;
  }, [signature, enabled, active, configured]);

  // Never show a previous habit/history snapshot while the new effect starts.
  const needsPrediction = enabled && active && habits.length > 0;
  const allowed = isAiEnabled();
  const unavailableReason = !needsPrediction
    ? null
    : !allowed
      ? 'AI sharing is disabled or its preference could not be saved. Check Settings.'
      : !configured
        ? 'The prediction service is not configured.'
        : null;
  const canRequest = needsPrediction && allowed && configured;
  const visibleState =
    canRequest && state.signature === signature
      ? state
      : {
          results: unavailableReason
            ? Object.fromEntries(
                habits.map((habit) => [
                  habit.id,
                  { unavailable: true, reason: unavailableReason },
                ])
              )
            : {},
          loading: canRequest,
          error: unavailableReason,
        };
  return {
    results: visibleState.results,
    loading: visibleState.loading,
    error: visibleState.error,
    configured,
    retry: () => {
      if (enabled && active && isAiEnabled())
        setRetryToken((token) => token + 1);
    },
  };
}

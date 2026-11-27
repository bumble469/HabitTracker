import { api } from './api';
import { toDateKey } from '../utils/insights';

export function validatePrediction(value) {
  if (
    !value ||
    typeof value.habit_id !== 'string' ||
    !value.as_of ||
    toDateKey(value.as_of) !== value.as_of ||
    !['low', 'medium', 'high', 'not_enough_data'].includes(value.level) ||
    !Array.isArray(value.reasons) ||
    !value.reasons.every((reason) => typeof reason === 'string')
  )
    return null;
  const validScore =
    value.level === 'not_enough_data'
      ? value.risk === null
      : Number.isFinite(value.risk) && value.risk >= 0 && value.risk <= 1;
  return validScore ? value : null;
}

export async function getRisk(signal) {
  // No today override: backend uses the authoritative saved account timezone.
  const values = await api('/api/risk', { signal });
  if (
    !Array.isArray(values) ||
    values.some((value) => !validatePrediction(value))
  )
    throw new Error('The backend returned invalid risk data. Please retry.');
  return Object.fromEntries(values.map((value) => [value.habit_id, value]));
}

export async function getRiskHistory(habitId, signal, window = {}) {
  const params = new URLSearchParams();
  if (window.start) params.set('start', window.start);
  if (window.end) params.set('end', window.end);
  const query = params.size ? `?${params}` : '';
  const values = await api(
    `/api/habits/${encodeURIComponent(habitId)}/risk/history${query}`,
    { signal }
  );
  if (
    !Array.isArray(values) ||
    values.some((item) => !validatePrediction({ ...item, habit_id: habitId }))
  )
    throw new Error('The backend returned invalid risk history. Please retry.');
  return values;
}

export function riskErrorMessage(error) {
  return error.status === 503
    ? 'Risk prediction is unavailable because the backend model is not installed. Habit tracking remains available.'
    : error.message || 'Risk prediction is unavailable. Please retry.';
}

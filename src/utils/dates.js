function validTimezone(timezone) {
  if (typeof timezone !== 'string' || !timezone.trim()) return 'UTC';
  try {
    return new Intl.DateTimeFormat('en', { timeZone: timezone }).resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

function timestampDate(value) {
  if (value === null || value === '' || value === undefined) return null;
  let input = value;
  if (typeof input === 'string') {
    const datePart = input.match(/^(\d{4}-\d{2}-\d{2})(?:T|$)/)?.[1];
    if (datePart) {
      const dateOnly = new Date(`${datePart}T00:00:00Z`);
      if (!Number.isFinite(dateOnly.getTime()) || dateOnly.toISOString().slice(0, 10) !== datePart)
        return null;
    }
    // Saved backend timestamps omit the suffix for UTC. Interpret them
    // consistently instead of depending on the browser's local timezone.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(input))
      input += 'Z';
  }
  const date = input instanceof Date ? input : new Date(input);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function dateKeyInTimezone(value = new Date(), timezone = 'UTC') {
  const date = timestampDate(value);
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: validTimezone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
}

export function formatTimestamp(value, timezone = 'UTC') {
  const date = timestampDate(value);
  if (!date) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: validTimezone(timezone),
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

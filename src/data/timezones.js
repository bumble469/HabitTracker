export function detectedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function timezoneOptions(current) {
  const fallback = [
    'Asia/Kolkata',
    'Asia/Tokyo',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Australia/Sydney',
  ];
  let zones;
  try {
    zones = Intl.supportedValuesOf('timeZone');
  } catch {
    zones = fallback;
  }
  try {
    if (current) new Intl.DateTimeFormat('en', { timeZone: current }).format();
    else current = 'UTC';
  } catch {
    current = 'UTC';
  }
  return [...new Set(['UTC', current, ...fallback, ...zones])].sort();
}

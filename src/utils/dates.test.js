import { describe, expect, it } from 'vitest';
import { dateKeyInTimezone, formatTimestamp } from './dates';

const instant = '2026-11-24T00:30:00Z';
describe('account timezone dates', () => {
  it('uses the account calendar date rather than the browser calendar date', () => {
    expect(dateKeyInTimezone(instant, 'America/Los_Angeles')).toBe('2026-11-23');
    expect(dateKeyInTimezone(instant, 'Asia/Kolkata')).toBe('2026-11-24');
    expect(dateKeyInTimezone('2026-12-31T20:00:00Z', 'Asia/Kolkata')).toBe('2027-01-01');
  });
  it('handles daylight saving changes using timezone rules', () => {
    expect(dateKeyInTimezone('2026-03-08T07:59:00Z', 'America/Los_Angeles')).toBe('2026-03-07');
    expect(dateKeyInTimezone('2026-03-08T08:01:00Z', 'America/Los_Angeles')).toBe('2026-03-08');
    expect(dateKeyInTimezone('2026-03-09T06:59:00Z', 'America/Los_Angeles')).toBe('2026-03-08');
    expect(dateKeyInTimezone('2026-03-09T07:01:00Z', 'America/Los_Angeles')).toBe('2026-03-09');
  });
  it.each([undefined, null, '', 'Invalid/Timezone'])('falls back to UTC for timezone %s', (timezone) => {
    expect(dateKeyInTimezone(instant, timezone)).toBe('2026-11-24');
    expect(formatTimestamp(instant, timezone)).toBe(formatTimestamp(instant, 'UTC'));
  });
  it('treats backend timestamps without an offset as UTC', () => {
    expect(formatTimestamp('2026-11-24T00:30:00', 'Asia/Kolkata')).toBe(formatTimestamp(instant, 'Asia/Kolkata'));
    expect(dateKeyInTimezone('2026-11-24T00:30:00', 'America/Los_Angeles')).toBe('2026-11-23');
    expect(formatTimestamp('2026-11-24T06:00:00+05:30', 'Asia/Kolkata')).toBe(formatTimestamp(instant, 'Asia/Kolkata'));
  });
  it.each([undefined, null, '', 'not-a-date', '2026-02-30T08:00:00', new Date(NaN)])('shows a useful timestamp placeholder for invalid input %s', (value) => {
    expect(formatTimestamp(value, 'Asia/Kolkata')).toBe('Time unavailable');
  });
  it('returns no date key for invalid input rather than a normalized incorrect day', () => {
    expect(dateKeyInTimezone(null)).toBe('');
    expect(dateKeyInTimezone('2026-02-30')).toBe('');
    expect(dateKeyInTimezone('not-a-date')).toBe('');
  });
});

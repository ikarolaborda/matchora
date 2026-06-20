/**
 * Time helpers. Internally everything is UTC ISO-8601; display formatting is
 * locale/timezone aware and lives only at the boundary.
 */

import type { Iso8601, Locale } from './types.js';

export function toUtcIso(input: string | number | Date): Iso8601 {
  return new Date(input).toISOString();
}

export function isSameUtcDay(a: Iso8601, b: Iso8601): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

/** Whether the instant falls on the given calendar day in a target timezone. */
export function isOnLocalDay(instant: Iso8601, dayUtc: Iso8601, timeZone: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(instant)) === fmt.format(new Date(dayUtc));
}

export function formatKickoff(instant: Iso8601, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(new Date(instant));
}

export function formatTime(instant: Iso8601, locale: Locale, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

/** "HH:mm" in a timezone — used by quiet-hours evaluation. */
export function localHourMinute(instant: Iso8601, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(instant));
}

/** Is the given local time inside the quiet-hours window (handles wrap past midnight). */
export function isWithinQuietHours(nowHm: string, start: string, end: string): boolean {
  if (start === end) {
    return false;
  }
  if (start < end) {
    return nowHm >= start && nowHm < end;
  }
  // window wraps midnight, e.g. 22:00 → 07:00
  return nowHm >= start || nowHm < end;
}

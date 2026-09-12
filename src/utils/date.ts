/**
 * Utility functions for date/time formatting
 * Used by staff portal - formats dates in IST timezone as per Indian locale
 */

const LOCALE = 'en-IN';

/**
 * Format a date string to a readable date format (e.g., "20 May 2026")
 * @param dateString - ISO date string or date-like value
 * @returns Formatted date string (e.g., "20 May 2026")
 */
export function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date/time string to a readable time format (e.g., "10:30 AM")
 * @param dateString - ISO date string or date-like value
 * @returns Formatted time string (e.g., "10:30 AM")
 */
export function formatTime(dateString?: string | Date | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date and time into a single display string
 * (e.g., "20 May 2026  10:30 AM - 11:30 AM")
 * @param dateString - execution date
 * @returns Combined formatted string (e.g., "20 May 2026  10:30 AM")
 */
export function formatDateTime(
  dateString?: string | Date | null,
): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleTimeString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date and time range into a single display string
 * (e.g., "20 May 2026  10:30 AM - 11:30 AM")
 * @param dateString - execution date
 * @param fromTimeString - from time
 * @param toTimeString - to time
 * @returns Combined formatted string
 */
export function formatDateTimeRange(
  dateString?: string | Date | null,
  fromTimeString?: string | Date | null,
  toTimeString?: string | Date | null,
): string {
  const date = formatDate(dateString);
  const from = formatTime(fromTimeString);
  const to = formatTime(toTimeString);

  if (!date && !from && !to) return '';

  const parts: string[] = [];
  if (date) parts.push(date);
  if (from || to) {
    parts.push(`${from || '--:--'} - ${to || '--:--'}`);
  }

  return parts.join('  ');
}

/**
 * Check if the current time has reached or passed the given fromTime.
 * This is used to prevent starting a task/checklist before its scheduled start time.
 * Both the fromTime and current time are compared in IST (Asia/Kolkata).
 * @param fromTimeString - The scheduled start time (UTC timestamp from DB)
 * @returns true if current time >= fromTime, false if before fromTime
 */
export function isTimeToStart(fromTimeString?: string | Date | null): boolean {
  if (!fromTimeString) return true; // No restriction if no fromTime set

  const fromTime = new Date(fromTimeString);
  if (isNaN(fromTime.getTime())) return true; // Invalid date, allow

  const now = new Date();
  return now >= fromTime;
}

/**
 * Compute the number of whole minutes that `reference` (defaults to "now") is past `target`.
 * Used to surface "Delayed by X Minutes" on not-started items and "Completed by X Minutes"
 * for items completed after their scheduled end time.
 *
 * Both values are treated as UTC timestamps (from_time/to_time/completed_at are
 * `timestamptz` on the backend). Returns `null` when `target` is missing/invalid or has
 * not yet been reached (less than a full minute has elapsed).
 *
 * @param target - The scheduled start/end time (e.g. fromTime/toTime)
 * @param reference - The reference instant, defaults to current time
 * @returns elapsed whole minutes past `target`, or null when not reached
 */
export function getMinutesPast(
  target?: string | Date | null,
  reference: string | Date = new Date(),
): number | null {
  if (!target) return null;
  const targetDate = new Date(target);
  const referenceDate = new Date(reference);
  if (isNaN(targetDate.getTime()) || isNaN(referenceDate.getTime())) return null;

  const diffMinutes = Math.floor((referenceDate.getTime() - targetDate.getTime()) / 60000);
  return diffMinutes > 0 ? diffMinutes : null;
}

/**
 * Format a minute count as a human-readable duration string.
 * e.g. 20 -> "20 Minutes", 90 -> "1 Hour 30 Minutes", 2900 -> "2 Days 10 Minutes"
 * @param minutes - duration in minutes
 * @returns formatted duration string
 */
export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return `${total} Minute${total === 1 ? '' : 's'}`;

  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const remainingMinutes = total % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} Day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? '' : 's'}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} Minute${remainingMinutes === 1 ? '' : 's'}`);

  return parts.join(' ');
}

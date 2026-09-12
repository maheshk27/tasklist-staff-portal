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

// Asia/Kolkata (IST) is UTC+05:30 and has no DST, so a fixed offset is safe.
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/**
 * Return true when both timestamps fall on the same IST calendar day.
 * @param a - first timestamp
 * @param b - second timestamp
 * @returns true if both are valid and share the same IST date
 */
export function isSameISTDay(a: string | Date, b: string | Date): boolean {
  const aDate = new Date(a);
  const bDate = new Date(b);
  if (isNaN(aDate.getTime()) || isNaN(bDate.getTime())) return false;

  const aKey = new Date(aDate.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  const bKey = new Date(bDate.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
  return aKey === bKey;
}

/**
 * Return the end of the IST calendar day that contains `dateTime`,
 * i.e. 00:00 IST of the following day. Used to cap delay computations for
 * historical (non-today) items so they don't accumulate multi-day delays.
 * @param dateTime - a timestamp (e.g. fromTime) whose IST day to find the end of
 * @returns Date at that IST day's midnight (start of the next IST day)
 */
export function endOfISTDay(dateTime: string | Date): Date {
  const date = new Date(dateTime);
  const istMs = date.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const nextMidnightUTC = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1);
  return new Date(nextMidnightUTC - IST_OFFSET_MS);
}

/**
 * Reference instant used for delay computations:
 *  - item scheduled for today → current time (`now`)
 *  - historical item → that execution day's midnight (end of the IST day)
 * This keeps "Delayed by X" sensible for past days (e.g. up to that day's midnight)
 * instead of measuring up to the far-side "now".
 * @param fromTime - scheduled start time (drives which IST day the item belongs to)
 * @param now - current instant, defaults to new Date()
 * @returns reference instant for the delay calculation
 */
export function getDelayReference(fromTime?: string | Date | null, now: Date = new Date()): Date {
  if (!fromTime) return now;
  const fromTimeDate = new Date(fromTime);
  if (isNaN(fromTimeDate.getTime())) return now;
  return isSameISTDay(fromTimeDate, now) ? now : endOfISTDay(fromTimeDate);
}

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

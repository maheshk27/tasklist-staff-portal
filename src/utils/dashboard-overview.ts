/**
 * Shared helpers for the dashboard store-overview sections
 * ("Today's Store Checklist Overview" / "Today's Store Survey Overview").
 *
 * These mirror the admin-portal dashboard exactly (same status colours, card
 * tints and chips) so both portals stay visually consistent.
 */

/** Today as a local YYYY-MM-DD string. */
export const getTodayString = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Human-readable label for a status code (e.g. NOT_STARTED -> Not Started). */
export const prettyStatus = (status: string): string =>
  status
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

/** Full-background pill styling per known status; unknown statuses fall back to gray. */
export const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-500 text-white border-green-600',
  IN_PROGRESS: 'bg-blue-500 text-white border-blue-600',
  NOT_STARTED: 'bg-gray-400 text-white border-gray-500',
  SKIPPED: 'bg-orange-500 text-white border-orange-600',
  OVERDUE: 'bg-red-500 text-white border-red-600',
}

export const DEFAULT_STATUS_STYLE = 'bg-gray-400 text-white border-gray-500'

/** Tinted summary-card styling per status for the Overall Status-wise Summary.
 *  Keys can be extended as new statuses appear; unknown statuses fall back to gray. */
export const STATUS_CARD_STYLES: Record<string, { card: string; label: string; count: string }> = {
  COMPLETED: { card: 'bg-green-50', label: 'text-green-700', count: 'text-green-700' },
  IN_PROGRESS: { card: 'bg-blue-50', label: 'text-blue-700', count: 'text-blue-700' },
  NOT_STARTED: { card: 'bg-gray-100', label: 'text-gray-600', count: 'text-gray-700' },
  SKIPPED: { card: 'bg-orange-50', label: 'text-orange-700', count: 'text-orange-700' },
  OVERDUE: { card: 'bg-red-50', label: 'text-red-700', count: 'text-red-700' },
}

export const DEFAULT_STATUS_CARD_STYLE: { card: string; label: string; count: string } = {
  card: 'bg-gray-100',
  label: 'text-gray-600',
  count: 'text-gray-700',
}

/** Completion % text color helper (matches the rest of the reports). */
export const completionColor = (percent: number): string =>
  percent >= 100 ? 'text-green-600' : percent >= 75 ? 'text-amber-600' : 'text-red-600'

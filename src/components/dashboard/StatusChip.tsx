import React from 'react'
import { DEFAULT_STATUS_STYLE, STATUS_STYLES, prettyStatus } from '../../utils/dashboard-overview'

/**
 * Compact status count chip shown on the dashboard store cards.
 * Mirrors the admin-portal dashboard chip so both portals stay consistent.
 */
const StatusChip: React.FC<{ status: string; count: number }> = ({ status, count }) => {
  const style = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE
  return (
    <span
      title={`${prettyStatus(status)}: ${count}`}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${style}`}
    >
      {count}
    </span>
  )
}

export default StatusChip

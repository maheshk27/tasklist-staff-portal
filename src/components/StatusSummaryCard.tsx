import React from 'react'
import { type LucideIcon, Clock, Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { TaskExecutionStatus } from '../types/task-execution'
import type { ChecklistStatus } from '../types/task-checklist-execution'

export interface StatusSummaryCardProps {
  /** Status key (used for active state comparison) */
  status: string
  /** Count to display */
  count: number
  /** Label to display */
  label: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Color class for the dot indicator (e.g. 'bg-blue-500') */
  dotColor: string
  /** Whether this card is currently selected/active */
  isActive?: boolean
  /** Click handler */
  onClick: () => void
}

/**
 * StatusSummaryCard — reusable status summary card with icon + dot + label.
 * Used in MyTasks, TaskExecutionDetail, and other pages for status filtering.
 */
const StatusSummaryCard: React.FC<StatusSummaryCardProps> = ({
  count,
  label,
  icon: Icon,
  dotColor,
  isActive = false,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl border border-border bg-card p-4 text-center shadow-sm transition-all ${
        isActive ? 'ring-2 ring-primary' : 'hover:opacity-80 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
          <span className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </span>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      </div>
      <div className="text-2xl font-extrabold text-foreground">
        {count}
      </div>
    </button>
  )
}

// ── Icon mappings for Task Execution statuses ──────────────────────────────────
const TASK_STATUS_ICONS: Record<TaskExecutionStatus, { icon: LucideIcon; dot: string }> = {
  NOT_STARTED: { icon: Clock, dot: 'bg-gray-500' },
  IN_PROGRESS: { icon: Activity, dot: 'bg-blue-500' },
  COMPLETED: { icon: CheckCircle2, dot: 'bg-green-500' },
  OVERDUE: { icon: AlertTriangle, dot: 'bg-red-500' },
}

// ── Icon mappings for Checklist statuses ───────────────────────────────────────
const CHECKLIST_STATUS_ICONS: Record<ChecklistStatus, { icon: LucideIcon; dot: string }> = {
  NOT_STARTED: { icon: Clock, dot: 'bg-gray-500' },
  IN_PROGRESS: { icon: Activity, dot: 'bg-blue-500' },
  COMPLETED: { icon: CheckCircle2, dot: 'bg-green-500' },
  OVERDUE: { icon: AlertTriangle, dot: 'bg-red-500' },
}

export { TASK_STATUS_ICONS, CHECKLIST_STATUS_ICONS }
export default StatusSummaryCard
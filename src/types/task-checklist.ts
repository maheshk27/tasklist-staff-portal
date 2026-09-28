/**
 * Master task checklist — the subset of fields the staff-portal reports need
 * from GET /task-checklists (used by the optional "Checklist" filter on the
 * store-date-wise completion report).
 */
export interface TaskChecklist {
  mstChecklistId: number
  mstTaskId: number
  title: string
  regionalText?: string
  description?: string
  isMandatory: boolean
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  sequence?: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

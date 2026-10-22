/**
 * Master task — the subset of fields the staff-portal reports need
 * from GET /task-masters (used by the optional "Master Tasklist" filter on the
 * store-date-wise completion report).
 */
export interface TaskMaster {
  mstTaskId: number
  title: string
  regionalText?: string
  assignedRoleId: number
}

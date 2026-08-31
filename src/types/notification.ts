/**
 * Notification log entry returned by the notification (cron) service.
 */
export interface NotificationLog {
  notificationId: number
  userId: number
  title: string
  body: string
  screenPath: string
  isRead: boolean
  createdAt: string
}

export interface NotificationLogPage {
  data: NotificationLog[]
  total: number
  page: number
  totalPages: number
}
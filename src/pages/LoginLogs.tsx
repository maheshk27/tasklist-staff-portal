import React, { useEffect, useState } from 'react'
import { onboardingService } from '../services/apiManager'
import type { LoginLog } from '../types/login-log'
import { formatDateTime } from '../utils/date'
import { PageHeader } from '../components/PageHeader'

const LoginLogs: React.FC = () => {
  const [logs, setLogs] = useState<LoginLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMyLoginLogs = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await onboardingService.getMyLoginLogs()
        setLogs(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch login logs')
      } finally {
        setLoading(false)
      }
    }

    fetchMyLoginLogs()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Login Logs"
        subtitle="Your recent login activity"
      />

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-lg">
          <div className="text-4xl mb-3">🕐</div>
          <h3 className="text-xl font-semibold">No login logs found</h3>
          <p className="text-muted-foreground mt-1">Your recent login activity will appear here.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Date & Time</th>
                  <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">IP Address</th>
                  <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Device / Browser</th>
                  <th className="text-left font-semibold px-4 py-3 whitespace-nowrap">Failure Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.loginLogId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${log.loginStatus === 'SUCCESS'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {log.loginStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{log.ipAddress || '-'}</td>
                    <td className="px-4 py-3 max-w-[240px] truncate" title={log.userAgent}>
                      {log.userAgent || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.failureReason ? (
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted">
                          {log.failureReason}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default LoginLogs
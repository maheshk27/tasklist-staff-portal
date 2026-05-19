import React from 'react'
import { useNavigate } from 'react-router-dom'

interface NotificationToastProps {
  title: string
  body?: string
  timestamp?: string
  icon?: string
  screenPath?: string
  onDismiss?: () => void
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  body,
  timestamp,
  icon,
  screenPath,
  onDismiss,
}) => {
  const navigate = useNavigate()

  const handleView = () => {
    if (screenPath) {
      navigate(screenPath)
    }
    if (onDismiss) onDismiss()
  }

  return (
    <div className="flex items-start gap-3 w-full max-w-sm">
      {/* Icon */}
      <div className="shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
        <span className="text-xl">{icon || '🔔'}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        {body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{body}</p>
        )}
        {timestamp && (
          <p className="text-[10px] text-muted-foreground/60 mt-1">{timestamp}</p>
        )}

        {/* Action buttons */}
        {screenPath && (
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleView}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20"
            >
              View Details
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
      >
        <svg className="w-3 h-3 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default NotificationToast
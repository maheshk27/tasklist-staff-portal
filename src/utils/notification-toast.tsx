import toast from 'react-hot-toast'
import NotificationToast from '../components/NotificationToast'

export function showNotificationToast(
  title: string,
  body?: string,
  icon?: string,
  duration = 6000,
) {
  const timestamp = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  toast.custom(
    (t: { id: string; visible: boolean }) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } pointer-events-auto flex w-full max-w-sm rounded-xl bg-card border border-border shadow-lg p-4 transition-all`}
      >
        <NotificationToast
          title={title}
          body={body}
          timestamp={timestamp}
          icon={icon}
          onDismiss={() => toast.dismiss(t.id)}
        />
      </div>
    ),
    {
      duration,
      position: 'top-right',
    },
  )
}
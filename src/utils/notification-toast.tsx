import toast from 'react-hot-toast'
import NotificationToast from '../components/NotificationToast'
import { formatTime } from './date';

export function showNotificationToast(
  title: string,
  body?: string,
  icon?: string,
  duration = 8000,
  screenPath?: string,
) {
  const timestamp = formatTime(new Date())
  
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
          screenPath={screenPath}
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
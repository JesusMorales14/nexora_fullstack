import { Bell, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link } from 'react-router'

import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { Button } from '@/components/ui/button'
import {
  type Notification,
  notificationDismissed,
  selectNotifications,
} from '@/features/notifications/notificationsSlice'

const AUTO_DISMISS_MS = 10_000

/**
 * On-screen notifications. The container is a polite live region that is always rendered, so screen
 * readers announce new messages without stealing focus.
 */
export function Toaster() {
  const notifications = useAppSelector(selectNotifications)

  return (
    <section
      aria-label="Notificaciones"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96"
    >
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </section>
  )
}

function Toast({ notification }: { notification: Notification }) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      dispatch(notificationDismissed(notification.id))
    }, AUTO_DISMISS_MS)
    return () => {
      window.clearTimeout(timer)
    }
  }, [dispatch, notification.id])

  function dismiss() {
    dispatch(notificationDismissed(notification.id))
  }

  return (
    <div className="pointer-events-auto flex w-full animate-in items-start gap-3 rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-lg fade-in slide-in-from-bottom-2">
      <Bell aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p>{notification.message}</p>
        {notification.link && (
          <Link
            to={notification.link}
            onClick={dismiss}
            className="w-fit font-medium text-primary hover:underline"
          >
            Ver detalle
          </Link>
        )}
      </div>
      <Button variant="ghost" size="icon-xs" onClick={dismiss} aria-label="Cerrar notificación">
        <X aria-hidden="true" />
      </Button>
    </div>
  )
}

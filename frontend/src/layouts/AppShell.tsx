import { Outlet } from 'react-router'

import { Toaster } from '@/features/notifications/components/Toaster'
import { useRealtimeNotifications } from '@/features/notifications/useRealtimeNotifications'

/**
 * Root of every route: one live connection and one notification area for the whole app, so moving
 * between the storefront and the admin panel does not reconnect.
 */
export function AppShell() {
  useRealtimeNotifications()

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  )
}

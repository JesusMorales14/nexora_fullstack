import { Outlet, useLocation } from 'react-router'

import { Toaster } from '@/features/notifications/components/Toaster'
import { OfflineBanner } from '@/features/pwa/OfflineBanner'
import { PwaUpdatePrompt } from '@/features/pwa/PwaUpdatePrompt'
import { useRealtimeNotifications } from '@/features/notifications/useRealtimeNotifications'

/** Private or per-user pages: never indexed (robots.txt also disallows crawling them). */
const PRIVATE_PATH =
  /^\/(admin|account|cart|checkout|orders|login|register|forgot-password|reset-password)(\/|$)/

/**
 * Root of every route: one live connection and one notification area for the whole app, so moving
 * between the storefront and the admin panel does not reconnect.
 */
export function AppShell() {
  useRealtimeNotifications()
  const { pathname } = useLocation()

  return (
    <>
      {PRIVATE_PATH.test(pathname) && <meta name="robots" content="noindex, nofollow" />}
      <OfflineBanner />
      <Outlet />
      <Toaster />
      <PwaUpdatePrompt />
    </>
  )
}

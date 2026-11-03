import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'

import { ForbiddenPage } from '@/components/shared/ForbiddenPage'
import { PageLoader } from '@/components/shared/PageLoader'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { getSafeRedirectPath } from '@/lib/utils/safeRedirect'

// Route guards are UX only: they avoid showing screens the user cannot use. The API checks
// authentication and roles on every request regardless of what the UI renders.

function useLoginRedirectPath() {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  return `/login?${new URLSearchParams({ returnTo }).toString()}`
}

export function RequireAuth() {
  const { isAuthenticated, isLoading } = useCurrentUser()
  const loginPath = useLoginRedirectPath()

  if (isLoading) return <PageLoader />
  return isAuthenticated ? <Outlet /> : <Navigate to={loginPath} replace />
}

export function RequireAdmin() {
  const { isAuthenticated, isAdmin, isLoading } = useCurrentUser()
  const loginPath = useLoginRedirectPath()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to={loginPath} replace />
  return isAdmin ? <Outlet /> : <ForbiddenPage />
}

/** Login/register make no sense with an active session: continue to where the user was going. */
export function GuestOnly() {
  const { isAuthenticated, isLoading } = useCurrentUser()
  const [searchParams] = useSearchParams()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Outlet />
  return <Navigate to={getSafeRedirectPath(searchParams.get('returnTo'), '/account')} replace />
}

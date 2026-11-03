import { useGetCurrentUserQuery } from '@/features/auth/api/authApi'
import { ROLES } from '@/features/auth/types'

/** Current session as seen by the UI. Authorization is still enforced by the API. */
export function useCurrentUser() {
  const { data: user = null, isLoading } = useGetCurrentUserQuery()

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    isAdmin: user?.roles.includes(ROLES.admin) ?? false,
  }
}

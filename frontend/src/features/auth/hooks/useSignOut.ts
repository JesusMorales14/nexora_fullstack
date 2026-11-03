import { useNavigate } from 'react-router'

import { useAppDispatch } from '@/app/store/hooks'
import { useLogoutMutation } from '@/features/auth/api/authApi'
import { baseApi, clearCsrfToken } from '@/lib/api/baseApi'

/**
 * Ends the session in the API, leaves protected pages and only then drops every cached
 * response, so nothing from the previous user stays in memory.
 *
 * Order matters: React Router applies navigations as transitions (low priority) while the
 * Redux reset renders synchronously, so without `flushSync` React would re-render the old
 * /account tree first and its guard would redirect to /login.
 */
export function useSignOut() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logout, { isLoading }] = useLogoutMutation()

  async function signOut() {
    await logout().unwrap()
    clearCsrfToken()
    await navigate('/', { replace: true, flushSync: true })
    dispatch(baseApi.util.resetApiState())
  }

  return { signOut, isSigningOut: isLoading }
}

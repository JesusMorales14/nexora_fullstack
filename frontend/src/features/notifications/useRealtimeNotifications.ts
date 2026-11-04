import { useEffect } from 'react'

import { useAppDispatch } from '@/app/store/hooks'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { realtimeStatusChanged } from '@/features/notifications/notificationsSlice'

/**
 * Keeps a SignalR connection open while someone is signed in. Events only trigger re-fetches through
 * RTK Query (the REST API stays the source of truth) plus an optional on-screen notification.
 */
export function useRealtimeNotifications() {
  const dispatch = useAppDispatch()
  const { user, isAdmin } = useCurrentUser()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return

    let isDisposed = false
    let disconnect: (() => void) | undefined

    // The SignalR client (~40 KB) is only downloaded once someone signs in.
    void import('@/features/notifications/realtimeConnection')
      .then(({ connectRealtime }) => {
        if (!isDisposed) disconnect = connectRealtime(dispatch, { isAdmin })
      })
      .catch(() => {
        if (!isDisposed) dispatch(realtimeStatusChanged('disconnected'))
      })

    return () => {
      isDisposed = true
      disconnect?.()
      dispatch(realtimeStatusChanged('idle'))
    }
  }, [dispatch, userId, isAdmin])
}

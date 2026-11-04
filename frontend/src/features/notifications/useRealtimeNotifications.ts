import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { useEffect } from 'react'

import { useAppDispatch } from '@/app/store/hooks'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import {
  notificationAdded,
  realtimeStatusChanged,
} from '@/features/notifications/notificationsSlice'
import {
  REALTIME_EVENT_NAMES,
  reactToRealtimeEvent,
  RECOVERY_TAGS,
} from '@/features/notifications/realtimeEvents'
import { API_BASE_URL, baseApi } from '@/lib/api/baseApi'

const HUB_PATH = '/hubs/notifications'

/** The hub lives on the API's origin (same origin in development thanks to the Vite proxy). */
function getHubUrl() {
  return new URL(HUB_PATH, new URL(API_BASE_URL, window.location.origin).origin).toString()
}

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
    const connection = new HubConnectionBuilder()
      // Session cookie travels with the connection; no token in the URL or in storage.
      .withUrl(getHubUrl(), { withCredentials: true })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    for (const eventName of REALTIME_EVENT_NAMES) {
      connection.on(eventName, (payload: unknown) => {
        const reaction = reactToRealtimeEvent(eventName, payload, { isAdmin })
        if (!reaction) return
        dispatch(baseApi.util.invalidateTags(reaction.tags))
        if (reaction.notification) dispatch(notificationAdded(reaction.notification))
      })
    }

    connection.onreconnecting(() => {
      dispatch(realtimeStatusChanged('reconnecting'))
    })
    connection.onreconnected(() => {
      dispatch(realtimeStatusChanged('connected'))
      // Anything that happened while offline was not delivered: fetch the current state.
      dispatch(baseApi.util.invalidateTags([...RECOVERY_TAGS]))
    })
    connection.onclose(() => {
      // Automatic reconnection gave up: screens fall back to polling (FALLBACK_POLLING_MS).
      if (!isDisposed) dispatch(realtimeStatusChanged('disconnected'))
    })

    dispatch(realtimeStatusChanged('connecting'))
    connection
      .start()
      .then(() => {
        if (!isDisposed) dispatch(realtimeStatusChanged('connected'))
      })
      .catch(() => {
        if (!isDisposed) dispatch(realtimeStatusChanged('disconnected'))
      })

    return () => {
      isDisposed = true
      void connection.stop()
      dispatch(realtimeStatusChanged('idle'))
    }
  }, [dispatch, userId, isAdmin])
}

import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit'

const MAX_VISIBLE_NOTIFICATIONS = 4

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface Notification {
  id: string
  message: string
  link?: string
}

interface NotificationsState {
  realtimeStatus: RealtimeStatus
  items: Notification[]
}

const initialState: NotificationsState = { realtimeStatus: 'idle', items: [] }

/** Client-only UI state: live-connection status and on-screen notifications. */
export const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    realtimeStatusChanged(state, action: PayloadAction<RealtimeStatus>) {
      state.realtimeStatus = action.payload
    },
    notificationAdded: {
      reducer(state, action: PayloadAction<Notification>) {
        state.items.push(action.payload)
        // Oldest first out, so a burst of events cannot cover the screen.
        state.items = state.items.slice(-MAX_VISIBLE_NOTIFICATIONS)
      },
      prepare(notification: Omit<Notification, 'id'>) {
        return { payload: { ...notification, id: nanoid() } }
      },
    },
    notificationDismissed(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload)
    },
  },
  selectors: {
    selectRealtimeStatus: (state) => state.realtimeStatus,
    selectNotifications: (state) => state.items,
  },
})

export const { realtimeStatusChanged, notificationAdded, notificationDismissed } =
  notificationsSlice.actions
export const { selectRealtimeStatus, selectNotifications } = notificationsSlice.selectors

/** Polling interval for screens that must stay fresh when the live connection is not available. */
export const FALLBACK_POLLING_MS = 30_000

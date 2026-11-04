import { useAppSelector } from '@/app/store/hooks'
import {
  FALLBACK_POLLING_MS,
  selectRealtimeStatus,
} from '@/features/notifications/notificationsSlice'

/**
 * RTK Query polling interval for screens that should stay fresh: 0 (no polling) while the live
 * connection works, periodic re-fetching when it is reconnecting or unavailable.
 */
export function useFallbackPolling(): number {
  const status = useAppSelector(selectRealtimeStatus)
  return status === 'connected' ? 0 : FALLBACK_POLLING_MS
}

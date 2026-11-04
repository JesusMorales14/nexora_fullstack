import { useAppSelector } from '@/app/store/hooks'
import { selectRealtimeStatus } from '@/features/notifications/notificationsSlice'
import { cn } from '@/lib/utils/cn'

const PRESENTATION = {
  connected: { label: 'En vivo', dot: 'bg-success-foreground' },
  connecting: { label: 'Conectando…', dot: 'bg-warning-foreground' },
  reconnecting: { label: 'Reconectando…', dot: 'bg-warning-foreground' },
  disconnected: { label: 'Sin conexión en vivo · actualiza cada 30 s', dot: 'bg-muted-foreground' },
  idle: { label: 'Sin conexión en vivo', dot: 'bg-muted-foreground' },
} as const

/** Tells the admin whether data updates by itself or periodically (text, not only a colored dot). */
export function RealtimeIndicator() {
  const status = useAppSelector(selectRealtimeStatus)
  const { label, dot } = PRESENTATION[status]

  return (
    <p role="status" className="flex items-center gap-2 px-3 text-xs text-muted-foreground">
      <span aria-hidden="true" className={cn('size-2 rounded-full', dot)} />
      {label}
    </p>
  )
}

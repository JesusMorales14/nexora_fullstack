import { WifiOff } from 'lucide-react'

import { useOnlineStatus } from '@/features/pwa/useOnlineStatus'

/** Tells the user they are offline and that what they see may be a saved copy. */
export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  return (
    <div role="status" aria-live="polite">
      {!isOnline && (
        <p className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
          <WifiOff aria-hidden="true" className="size-4 shrink-0" />
          Sin conexión. Estás viendo información guardada; no podrás comprar hasta reconectarte.
        </p>
      )}
    </div>
  )
}

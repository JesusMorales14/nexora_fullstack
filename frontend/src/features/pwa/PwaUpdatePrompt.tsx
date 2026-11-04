import { useRegisterSW } from 'virtual:pwa-register/react'

import { Button } from '@/components/ui/button'

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * Registers the service worker (production builds only) and asks before switching to a new
 * version, so a reload never interrupts a form or a checkout in progress.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Long-lived tabs (installed app) still learn about deploys.
      setInterval(() => {
        void registration.update()
      }, UPDATE_CHECK_INTERVAL_MS)
    },
    onRegisterError(error: unknown) {
      console.error('No se pudo registrar el service worker', error)
    },
  })

  if (!needRefresh) return null

  return (
    <div
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      className="fixed bottom-4 left-4 z-50 flex max-w-sm flex-col gap-3 rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-lg"
    >
      <p id="pwa-update-title" className="font-medium">
        Nueva versión disponible
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          Actualizar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setNeedRefresh(false)
          }}
        >
          Más tarde
        </Button>
      </div>
    </div>
  )
}

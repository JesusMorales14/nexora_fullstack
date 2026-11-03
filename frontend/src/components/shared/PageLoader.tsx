import { LoaderCircle } from 'lucide-react'

export function PageLoader() {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}

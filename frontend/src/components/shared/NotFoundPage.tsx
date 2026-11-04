import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <title>Página no encontrada | Nexora</title>
      <meta name="robots" content="noindex" />
      <p className="text-sm font-semibold text-primary">Error 404</p>
      <h1 className="text-3xl font-bold tracking-tight">Página no encontrada</h1>
      <p className="text-muted-foreground">
        La página que buscas no existe o fue movida. Revisa la dirección o vuelve al inicio.
      </p>
      <Button asChild size="lg">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </section>
  )
}

import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-semibold text-primary">Error 403</p>
      <h1 className="text-3xl font-bold tracking-tight">No tienes acceso a esta sección</h1>
      <p className="text-muted-foreground">
        Tu cuenta no tiene los permisos necesarios. Si crees que es un error, contacta a un
        administrador.
      </p>
      <Button asChild size="lg">
        <Link to="/">Volver a la tienda</Link>
      </Button>
    </section>
  )
}

import { isRouteErrorResponse, useRouteError } from 'react-router'

import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { Button } from '@/components/ui/button'

const HTTP_NOT_FOUND = 404

/** Route-level error boundary: renders instead of the route when it throws while rendering or loading. */
export function RouteErrorBoundary() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === HTTP_NOT_FOUND) {
    return <NotFoundPage />
  }

  // The error details are intentionally not shown to the user; they belong in monitoring.
  console.error(error)

  return (
    <section
      role="alert"
      className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center"
    >
      <h1 className="text-3xl font-bold tracking-tight">Algo salió mal</h1>
      <p className="text-muted-foreground">
        Ocurrió un error inesperado. Intenta recargar la página.
      </p>
      <Button
        size="lg"
        onClick={() => {
          window.location.reload()
        }}
      >
        Recargar
      </Button>
    </section>
  )
}

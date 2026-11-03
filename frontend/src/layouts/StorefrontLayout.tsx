import { ShoppingCart } from 'lucide-react'
import { Link, NavLink, Outlet, ScrollRestoration } from 'react-router'

import { cn } from '@/lib/utils'

const MAIN_CONTENT_ID = 'main-content'

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground',
  )
}

export function StorefrontLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido principal
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Nexora
          </Link>

          <nav aria-label="Principal" className="flex items-center gap-1">
            <NavLink to="/products" className={navLinkClassName}>
              Catálogo
            </NavLink>
            <NavLink to="/cart" className={navLinkClassName} aria-label="Carrito de compras">
              <ShoppingCart aria-hidden="true" className="size-5" />
            </NavLink>
          </nav>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} Nexora. Precios en soles (S/) con IGV incluido.
        </div>
      </footer>

      <ScrollRestoration />
    </div>
  )
}

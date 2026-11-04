import {
  FolderTree,
  History,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Store,
  Warehouse,
} from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'

import { cn } from '@/lib/utils/cn'

interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Productos', icon: Package },
  { to: '/admin/categories', label: 'Categorías', icon: FolderTree },
  { to: '/admin/inventory', label: 'Inventario', icon: Warehouse },
  { to: '/admin/audit-log', label: 'Auditoría', icon: History },
]

const MAIN_CONTENT_ID = 'admin-main'

// Rendered behind RequireAdmin (routes.tsx). That guard is UX only: every admin endpoint
// is protected by the AdminOnly policy in the API.
export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 md:flex-row">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido principal
      </a>

      <aside className="border-b bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-16 items-center px-4">
          <Link to="/admin" className="text-lg font-bold tracking-tight">
            Nexora <span className="text-muted-foreground">Admin</span>
          </Link>
        </div>
        {/* Horizontal, scrollable strip on phones; vertical sidebar from md up. */}
        <nav
          aria-label="Administración"
          className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent',
                  isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
                )
              }
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </NavLink>
          ))}
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent md:mt-4"
          >
            <Store aria-hidden="true" className="size-4" />
            Ver tienda
          </Link>
        </nav>
      </aside>

      <main
        id={MAIN_CONTENT_ID}
        tabIndex={-1}
        className="min-w-0 flex-1 p-4 focus:outline-none sm:p-6"
      >
        <Outlet />
      </main>
    </div>
  )
}

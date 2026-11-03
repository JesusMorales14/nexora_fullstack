import { LayoutDashboard } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'

import { cn } from '@/lib/utils/cn'

// TODO(fase-5): guard with the authenticated user's role. This is UX only;
// the API remains the authority that rejects unauthorized requests.
export function AdminLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-muted/40 md:flex-row">
      <aside className="border-b bg-sidebar text-sidebar-foreground md:w-60 md:border-r md:border-b-0">
        <div className="flex h-16 items-center px-4">
          <Link to="/admin" className="text-lg font-bold tracking-tight">
            Nexora <span className="text-muted-foreground">Admin</span>
          </Link>
        </div>
        <nav aria-label="Administración" className="flex gap-1 px-2 pb-2 md:flex-col">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )
            }
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
            Dashboard
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}

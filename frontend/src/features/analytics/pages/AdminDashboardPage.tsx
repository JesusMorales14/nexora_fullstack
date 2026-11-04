import { AlertTriangle, Package, PackageX, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useFallbackPolling } from '@/features/notifications/useFallbackPolling'
import { useGetAdminSummaryQuery } from '@/features/analytics/api/adminApi'
import { getErrorMessage } from '@/lib/api/apiErrors'

interface StatCardProps {
  label: string
  value: number
  detail?: string
  icon: LucideIcon
}

function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
    </div>
  )
}

export function AdminDashboardPage() {
  const pollingInterval = useFallbackPolling()
  const {
    data: summary,
    error,
    isLoading,
    isError,
    refetch,
  } = useGetAdminSummaryQuery(undefined, { pollingInterval })

  return (
    <div className="flex flex-col gap-6">
      <title>Dashboard | Nexora Admin</title>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {isLoading ? (
        <div role="status" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <span className="sr-only">Cargando indicadores…</span>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        summary && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Productos"
              value={summary.totalProducts}
              detail={`${String(summary.publishedProducts)} publicados`}
              icon={Package}
            />
            <StatCard
              label="Variantes con stock bajo"
              value={summary.lowStockVariants}
              icon={AlertTriangle}
            />
            <StatCard
              label="Variantes agotadas"
              value={summary.outOfStockVariants}
              icon={PackageX}
            />
            <StatCard label="Clientes" value={summary.customers} icon={Users} />
          </div>
        )
      )}

      {summary && summary.lowStockVariants + summary.outOfStockVariants > 0 && (
        <Link
          to="/admin/inventory?lowStock=true"
          className="self-start text-sm font-medium text-primary hover:underline"
        >
          Revisar el stock bajo en Inventario →
        </Link>
      )}
    </div>
  )
}

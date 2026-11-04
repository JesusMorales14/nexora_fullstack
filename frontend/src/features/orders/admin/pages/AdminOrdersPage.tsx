import { Search } from 'lucide-react'
import { type SubmitEvent, useState } from 'react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Pagination } from '@/components/shared/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type AdminOrderListParams,
  useGetAdminOrdersQuery,
} from '@/features/orders/admin/adminOrdersApi'
import { useFallbackPolling } from '@/features/notifications/useFallbackPolling'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { ORDER_STATUS_PRESENTATION } from '@/features/orders/orderStatus'
import type { OrderStatus } from '@/features/orders/types'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/formatDate'
import { getFormText } from '@/lib/utils/formData'
import { formatPrice } from '@/lib/utils/formatPrice'

const STATUSES = Object.keys(ORDER_STATUS_PRESENTATION) as OrderStatus[]

export function AdminOrdersPage() {
  const pollingInterval = useFallbackPolling()
  const [filters, setFilters] = useState<AdminOrderListParams>({ page: 1 })
  const { data, error, isLoading, isFetching, isError, refetch } = useGetAdminOrdersQuery(filters, {
    pollingInterval,
  })

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = getFormText(new FormData(event.currentTarget), 'q')
    setFilters((current) => ({ ...current, q: q || undefined, page: 1 }))
  }

  return (
    <div className="flex flex-col gap-6">
      <title>Pedidos | Nexora Admin</title>
      <PageHeader title="Pedidos" description="Los más recientes primero." />

      <div className="flex flex-wrap items-end gap-3">
        <form role="search" onSubmit={handleSearch} className="flex gap-2">
          <label htmlFor="admin-order-search" className="sr-only">
            Buscar por número de pedido o correo
          </label>
          <Input
            id="admin-order-search"
            name="q"
            type="search"
            placeholder="NX-… o correo"
            className="h-9 w-56"
          />
          <Button type="submit" variant="outline" size="icon-lg" aria-label="Buscar">
            <Search aria-hidden="true" />
          </Button>
        </form>
        <div className="flex flex-col gap-1">
          <Label htmlFor="admin-order-status" className="text-xs text-muted-foreground">
            Estado
          </Label>
          <select
            id="admin-order-status"
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={filters.status ?? ''}
            onChange={(event) => {
              const value = event.target.value
              setFilters((current) => ({
                ...current,
                status: STATUSES.find((status) => status === value),
                page: 1,
              }))
            }}
          >
            <option value="">Todos</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_PRESENTATION[status].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No hay pedidos con esos filtros" />
      ) : (
        <>
          <div
            className={cn('overflow-x-auto rounded-xl border bg-card', isFetching && 'opacity-70')}
          >
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Pedidos</caption>
              <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Pedido
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Total
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-muted/40">
                    <th scope="row" className="px-4 py-3 text-left font-normal">
                      <Link
                        to={`/admin/orders/${order.orderNumber}`}
                        className="font-mono font-medium hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {order.itemCount} {order.itemCount === 1 ? 'unidad' : 'unidades'}
                      </p>
                    </th>
                    <td className="px-4 py-3">
                      {order.customerName}
                      <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onPageChange={(page) => {
              setFilters((current) => ({ ...current, page }))
            }}
          />
        </>
      )}
    </div>
  )
}

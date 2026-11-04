import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { useGetOrdersQuery } from '@/features/orders/api/ordersApi'
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { formatDateTime } from '@/lib/utils/formatDate'
import { formatPrice } from '@/lib/utils/formatPrice'

export function OrdersPage() {
  const { data: orders, error, isLoading, isError, refetch } = useGetOrdersQuery()

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <title>Mis pedidos | Nexora</title>
      <div className="flex flex-col gap-1">
        <Link to="/account" className="text-sm text-muted-foreground hover:underline">
          ← Mi cuenta
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Mis pedidos</h1>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          title="Aún no tienes pedidos"
          action={
            <Button asChild>
              <Link to="/products">Ver catálogo</Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border">
          {orders.map((order) => (
            <li key={order.orderNumber}>
              <Link
                to={`/account/orders/${order.orderNumber}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-medium">Pedido {order.orderNumber}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(order.createdAt)} · {order.itemCount}{' '}
                    {order.itemCount === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold">{formatPrice(order.total)}</span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

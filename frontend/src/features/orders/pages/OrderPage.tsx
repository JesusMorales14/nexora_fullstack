import { CheckCircle2 } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/shared/ErrorState'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { useFallbackPolling } from '@/features/notifications/useFallbackPolling'
import { useGetOrderQuery } from '@/features/orders/api/ordersApi'
import { OrderDetails } from '@/features/orders/components/OrderDetails'
import { getErrorMessage, getHttpStatus } from '@/lib/api/apiErrors'

const HTTP_NOT_FOUND = 404

interface OrderPageProps {
  /** Shown right after a successful payment. */
  isConfirmation?: boolean
}

export function OrderPage({ isConfirmation = false }: OrderPageProps) {
  const pollingInterval = useFallbackPolling()
  const { orderNumber = '' } = useParams()
  const {
    data: order,
    error,
    isLoading,
    isError,
    refetch,
  } = useGetOrderQuery(orderNumber, { pollingInterval })

  if (isLoading) return <PageLoader />
  if (isError) {
    if (getHttpStatus(error) === HTTP_NOT_FOUND) return <NotFoundPage />
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </div>
    )
  }
  if (!order) return null

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <title>{`Pedido ${order.orderNumber} | Nexora`}</title>

      {isConfirmation && order.status === 'Paid' ? (
        <div className="flex flex-col items-start gap-2">
          <CheckCircle2 aria-hidden="true" className="size-10 text-success-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">¡Gracias por tu compra!</h1>
          <p className="text-muted-foreground">
            Recibimos tu pago. Te avisaremos cuando tu pedido salga a reparto.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <Link to="/account/orders" className="text-sm text-muted-foreground hover:underline">
            ← Mis pedidos
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Pedido {order.orderNumber}</h1>
        </div>
      )}

      <OrderDetails order={order} />

      {order.status === 'PendingPayment' && (
        <Button asChild size="lg" className="self-start">
          <Link to={`/checkout/pay/${order.orderNumber}`}>Completar pago</Link>
        </Button>
      )}
    </div>
  )
}

export function OrderConfirmationPage() {
  return <OrderPage isConfirmation />
}

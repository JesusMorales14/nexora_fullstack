import { FlaskConical } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { useAppDispatch } from '@/app/store/hooks'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { cartCleared } from '@/features/cart/cartSlice'
import { getOrderStatusLabel } from '@/features/orders/orderStatus'
import { useGetOrderQuery, useSimulatePaymentMutation } from '@/features/orders/api/ordersApi'
import {
  type ApiError,
  getErrorMessage,
  getHttpStatus,
  type ProblemDetails,
} from '@/lib/api/apiErrors'
import { formatPrice } from '@/lib/utils/formatPrice'

const HTTP_NOT_FOUND = 404

/**
 * Stand-in for a payment provider's hosted checkout (test mode only). A real integration would
 * redirect to the provider and receive the verdict through a server-to-server webhook.
 */
export function SimulatedPaymentPage() {
  const { orderNumber = '' } = useParams()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { data: order, error, isLoading, isError, refetch } = useGetOrderQuery(orderNumber)
  const [simulatePayment, { isLoading: isPaying }] = useSimulatePaymentMutation()
  const [paymentError, setPaymentError] = useState<string | null>(null)

  async function handlePayment(approved: boolean) {
    setPaymentError(null)
    try {
      const updated = await simulatePayment({ orderNumber, approved }).unwrap()
      if (updated.status === 'Paid') {
        dispatch(cartCleared())
        void navigate(`/orders/${orderNumber}/confirmation`, { replace: true })
      } else {
        setPaymentError(
          'El pago fue rechazado y no se realizó ningún cargo. Tus productos siguen en el carrito.',
        )
      }
    } catch (caught: unknown) {
      const apiError = caught as ApiError
      const detail =
        apiError && 'data' in apiError
          ? (apiError.data as ProblemDetails | undefined)?.detail
          : undefined
      setPaymentError(detail ?? getErrorMessage(apiError))
    }
  }

  if (isLoading) return <PageLoader />
  if (isError) {
    if (getHttpStatus(error) === HTTP_NOT_FOUND) return <NotFoundPage />
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </div>
    )
  }
  if (!order) return null

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-12">
      <title>Pago | Nexora</title>
      <h1 className="text-2xl font-bold tracking-tight">Pagar pedido {order.orderNumber}</h1>

      <div className="flex items-start gap-3 rounded-xl border border-warning-foreground/30 bg-warning p-4 text-sm text-warning-foreground">
        <FlaskConical aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <p>
          <strong>Modo de prueba.</strong> Esta pasarela es simulada: no se pide ninguna tarjeta ni
          se realiza ningún cobro.
        </p>
      </div>

      <dl className="flex justify-between rounded-xl border p-5 text-lg font-semibold">
        <dt>Total a pagar</dt>
        <dd>{formatPrice(order.total)}</dd>
      </dl>

      {paymentError && (
        <div className="flex flex-col items-start gap-2">
          <FormAlert message={paymentError} />
          <Link to="/cart" className="text-sm font-medium text-primary hover:underline">
            Volver al carrito
          </Link>
        </div>
      )}

      {order.status === 'PendingPayment' ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="h-11 flex-1"
            disabled={isPaying}
            onClick={() => void handlePayment(true)}
          >
            {isPaying ? 'Procesando…' : 'Aprobar pago'}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-11 flex-1"
            disabled={isPaying}
            onClick={() => void handlePayment(false)}
          >
            Rechazar pago
          </Button>
        </div>
      ) : (
        !paymentError && (
          <p className="text-sm">
            Este pedido está en estado <strong>{getOrderStatusLabel(order.status)}</strong>.{' '}
            <Link
              to={`/account/orders/${order.orderNumber}`}
              className="font-medium text-primary hover:underline"
            >
              Ver pedido
            </Link>
          </p>
        )
      )}
    </div>
  )
}

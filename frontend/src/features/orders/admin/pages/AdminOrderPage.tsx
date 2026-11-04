import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  type OrderTransition,
  useChangeOrderStatusMutation,
  useGetAdminOrderQuery,
} from '@/features/orders/admin/adminOrdersApi'
import { OrderDetails } from '@/features/orders/components/OrderDetails'
import {
  type ApiError,
  getErrorMessage,
  getHttpStatus,
  getProblemDetail,
} from '@/lib/api/apiErrors'
import { formatDateTime } from '@/lib/utils/formatDate'

const HTTP_NOT_FOUND = 404

const TRANSITION_COPY: Record<
  OrderTransition,
  { action: string; confirm: string; variant: 'default' | 'destructive' }
> = {
  Shipped: {
    action: 'Marcar como enviado',
    confirm: 'El cliente verá su pedido como enviado.',
    variant: 'default',
  },
  Delivered: {
    action: 'Marcar como entregado',
    confirm: 'El pedido se cerrará como entregado.',
    variant: 'default',
  },
  Cancelled: {
    action: 'Cancelar pedido',
    confirm: 'El pedido no está pagado: se cancelará y su stock reservado volverá a la venta.',
    variant: 'destructive',
  },
}

export function AdminOrderPage() {
  const { orderNumber = '' } = useParams()
  const { data, error, isLoading, isError, refetch } = useGetAdminOrderQuery(orderNumber)
  const [changeStatus, { isLoading: isChanging }] = useChangeOrderStatusMutation()
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleTransition(status: OrderTransition) {
    setActionError(null)
    try {
      await changeStatus({ orderNumber, status }).unwrap()
    } catch (caught: unknown) {
      const apiError = caught as ApiError
      setActionError(getProblemDetail(apiError) ?? getErrorMessage(apiError))
    }
  }

  if (isLoading) return <PageLoader />
  if (isError) {
    if (getHttpStatus(error) === HTTP_NOT_FOUND) return <NotFoundPage />
    return <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
  }
  if (!data) return null

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <title>{`Pedido ${data.order.orderNumber} | Nexora Admin`}</title>
      <Link to="/admin/orders" className="text-sm text-muted-foreground hover:underline">
        ← Pedidos
      </Link>
      <PageHeader
        title={`Pedido ${data.order.orderNumber}`}
        actions={data.allowedTransitions.map((transition) => (
          <AlertDialog key={transition}>
            <AlertDialogTrigger asChild>
              <Button variant={TRANSITION_COPY[transition].variant} disabled={isChanging}>
                {TRANSITION_COPY[transition].action}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{TRANSITION_COPY[transition].action}</AlertDialogTitle>
                <AlertDialogDescription>
                  {TRANSITION_COPY[transition].confirm}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleTransition(transition)}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      />

      {actionError && <FormAlert message={actionError} />}

      <section aria-labelledby="customer-heading" className="rounded-xl border bg-card p-5 text-sm">
        <h2 id="customer-heading" className="mb-2 font-semibold">
          Cliente
        </h2>
        <p>{data.customerName}</p>
        <p className="text-muted-foreground">{data.customerEmail}</p>
        {data.shippedAt && (
          <p className="mt-2 text-muted-foreground">Enviado: {formatDateTime(data.shippedAt)}</p>
        )}
      </section>

      <OrderDetails order={data.order} />
    </div>
  )
}

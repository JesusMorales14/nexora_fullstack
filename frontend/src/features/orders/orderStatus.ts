import type { OrderStatus } from '@/features/orders/types'

export const ORDER_STATUS_PRESENTATION: Record<OrderStatus, { label: string; className: string }> =
  {
    PendingPayment: { label: 'Pendiente de pago', className: 'bg-warning text-warning-foreground' },
    Paid: { label: 'Pagado', className: 'bg-success text-success-foreground' },
    PaymentFailed: { label: 'Pago rechazado', className: 'bg-destructive/10 text-destructive' },
    Cancelled: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
    Shipped: { label: 'Enviado', className: 'bg-accent text-accent-foreground' },
    Delivered: { label: 'Entregado', className: 'bg-success text-success-foreground' },
  }

export function getOrderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_PRESENTATION[status].label
}

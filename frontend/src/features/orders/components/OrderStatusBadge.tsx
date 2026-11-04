import { ORDER_STATUS_PRESENTATION } from '@/features/orders/orderStatus'
import type { OrderStatus } from '@/features/orders/types'
import { cn } from '@/lib/utils/cn'

/** The status is always written out: color only reinforces it (WCAG 1.4.1). */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = ORDER_STATUS_PRESENTATION[status]

  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', className)}>
      {label}
    </span>
  )
}

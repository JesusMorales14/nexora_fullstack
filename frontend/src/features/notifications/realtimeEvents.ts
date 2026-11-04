import { z } from 'zod'

import { getOrderStatusLabel } from '@/features/orders/orderStatus'
import type { OrderStatus } from '@/features/orders/types'
import { formatPrice } from '@/lib/utils/formatPrice'

// Mirrors Nexora.Application.Realtime. Payloads are validated like any other external input:
// an unexpected shape is ignored instead of crashing the UI.

const orderStatuses = [
  'PendingPayment',
  'Paid',
  'PaymentFailed',
  'Cancelled',
  'Shipped',
  'Delivered',
] as const satisfies readonly OrderStatus[]

export const orderPaidSchema = z.object({
  orderNumber: z.string().min(1),
  total: z.number(),
  occurredAt: z.string(),
})

export const orderStatusChangedSchema = z.object({
  orderNumber: z.string().min(1),
  status: z.enum(orderStatuses),
  occurredAt: z.string(),
})

export const stockLowSchema = z.object({
  variantId: z.string(),
  sku: z.string(),
  productName: z.string(),
  available: z.number().int(),
  occurredAt: z.string(),
})

export const REALTIME_EVENT_NAMES = ['OrderPaid', 'OrderStatusChanged', 'StockLow'] as const
export type RealtimeEventName = (typeof REALTIME_EVENT_NAMES)[number]

type CacheTag =
  | { type: 'Order' | 'AdminOrder'; id: string }
  | 'AdminSummary'
  | 'AdminInventory'
  | 'AdminProduct'
  | 'AdminCustomer'

export interface RealtimeReaction {
  /** Server data to re-fetch: the event is a hint, the REST API is the source of truth. */
  tags: CacheTag[]
  notification?: { message: string; link: string }
}

/** Customers are only told about steps they did not trigger themselves. */
const CUSTOMER_NOTIFIED_STATUSES = new Set<OrderStatus>(['Shipped', 'Delivered', 'Cancelled'])

/** Pure mapping from a hub event to cache invalidation and an optional notification. */
export function reactToRealtimeEvent(
  eventName: RealtimeEventName,
  payload: unknown,
  { isAdmin }: { isAdmin: boolean },
): RealtimeReaction | null {
  switch (eventName) {
    case 'OrderPaid': {
      const parsed = orderPaidSchema.safeParse(payload)
      if (!parsed.success) return null
      const { orderNumber, total } = parsed.data
      return {
        tags: [
          { type: 'AdminOrder', id: 'LIST' },
          'AdminSummary',
          'AdminCustomer',
          'AdminInventory',
        ],
        notification: {
          message: `Nuevo pedido pagado ${orderNumber} por ${formatPrice(total)}`,
          link: `/admin/orders/${orderNumber}`,
        },
      }
    }
    case 'StockLow': {
      const parsed = stockLowSchema.safeParse(payload)
      if (!parsed.success) return null
      const { productName, sku, available } = parsed.data
      return {
        tags: ['AdminInventory', 'AdminSummary', 'AdminProduct'],
        notification: {
          message:
            available <= 0
              ? `Agotado: ${productName} (${sku})`
              : `Stock bajo: ${productName} (${sku}), quedan ${String(available)}`,
          link: '/admin/inventory?lowStock=true',
        },
      }
    }
    case 'OrderStatusChanged': {
      const parsed = orderStatusChangedSchema.safeParse(payload)
      if (!parsed.success) return null
      const { orderNumber, status } = parsed.data
      return {
        tags: [
          { type: 'Order', id: orderNumber },
          { type: 'Order', id: 'LIST' },
          { type: 'AdminOrder', id: orderNumber },
          { type: 'AdminOrder', id: 'LIST' },
        ],
        notification:
          !isAdmin && CUSTOMER_NOTIFIED_STATUSES.has(status)
            ? {
                message: `Tu pedido ${orderNumber} ahora está: ${getOrderStatusLabel(status)}`,
                link: `/account/orders/${orderNumber}`,
              }
            : undefined,
      }
    }
  }
}

/** Re-fetched after a reconnection, because events sent while offline are lost. */
export const RECOVERY_TAGS = ['Order', 'AdminOrder', 'AdminSummary', 'AdminInventory'] as const

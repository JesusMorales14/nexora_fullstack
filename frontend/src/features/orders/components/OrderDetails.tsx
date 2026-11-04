import { Link } from 'react-router'

import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge'
import type { Order } from '@/features/orders/types'
import { formatDateTime } from '@/lib/utils/formatDate'
import { formatPrice } from '@/lib/utils/formatPrice'

interface OrderDetailsProps {
  order: Order
}

export function OrderDetails({ order }: OrderDetailsProps) {
  const address = order.shippingAddress

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <OrderStatusBadge status={order.status} />
        <span className="text-muted-foreground">
          Pedido {order.orderNumber} · {formatDateTime(order.createdAt)}
        </span>
      </div>

      <section aria-labelledby="order-items-heading" className="rounded-xl border">
        <h2 id="order-items-heading" className="border-b px-5 py-3 font-semibold">
          Productos
        </h2>
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.variantId} className="flex flex-wrap justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link to={`/products/${item.productSlug}`} className="font-medium hover:underline">
                  {item.productName}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {item.variantName} · {item.quantity} × {formatPrice(item.unitPrice)}
                </p>
              </div>
              <p className="font-medium">{formatPrice(item.lineTotal)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="order-address-heading" className="rounded-xl border p-5">
          <h2 id="order-address-heading" className="mb-3 font-semibold">
            Envío
          </h2>
          <address className="flex flex-col gap-0.5 text-sm not-italic">
            <span className="font-medium">{address.recipientName}</span>
            <span>{address.addressLine}</span>
            <span>
              {address.district}, {address.province}, {address.department}
            </span>
            {address.reference && (
              <span className="text-muted-foreground">Ref.: {address.reference}</span>
            )}
            <span className="text-muted-foreground">Celular: {address.phone}</span>
          </address>
          <p className="mt-3 text-sm text-muted-foreground">{order.shippingMethod}</p>
        </section>

        <section aria-labelledby="order-totals-heading" className="rounded-xl border p-5">
          <h2 id="order-totals-heading" className="mb-3 font-semibold">
            Totales
          </h2>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Envío</dt>
              <dd>{order.shippingCost === 0 ? 'Gratis' : formatPrice(order.shippingCost)}</dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Op. gravada</dt>
              <dd>{formatPrice(order.taxableAmount)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>IGV ({String(Math.round(order.taxRate * 100))}%)</dt>
              <dd>{formatPrice(order.taxAmount)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  )
}

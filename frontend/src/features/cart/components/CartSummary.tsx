import type { ReactNode } from 'react'

import type { CartQuote } from '@/features/cart/types'
import { formatPrice } from '@/lib/utils/formatPrice'

interface CartSummaryProps {
  quote: CartQuote
  children?: ReactNode
}

/** Totals exactly as computed by the API (never recalculated in the browser). */
export function CartSummary({ quote, children }: CartSummaryProps) {
  const missingForFreeShipping = quote.freeShippingThreshold - quote.subtotal

  return (
    <section
      aria-labelledby="cart-summary-heading"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <h2 id="cart-summary-heading" className="text-lg font-semibold">
        Resumen
      </h2>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd>{formatPrice(quote.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Envío</dt>
          <dd>
            {quote.shipping === null
              ? 'Se calcula con tu dirección'
              : quote.shipping.cost === 0
                ? 'Gratis'
                : formatPrice(quote.shipping.cost)}
          </dd>
        </div>
        {quote.shipping && (
          <p className="text-xs text-muted-foreground">
            {quote.shipping.label}: {quote.shipping.estimatedDelivery}
          </p>
        )}
        <div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(quote.total)}</dd>
        </div>
        <p className="text-xs text-muted-foreground">
          Incluye IGV ({String(Math.round(quote.tax.rate * 100))}%):{' '}
          {formatPrice(quote.tax.taxAmount)}
        </p>
      </dl>

      {missingForFreeShipping > 0 && (
        <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">
          Te faltan {formatPrice(missingForFreeShipping)} para el envío gratis.
        </p>
      )}

      {children}
    </section>
  )
}

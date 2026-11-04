import { Trash2 } from 'lucide-react'
import { Link } from 'react-router'

import { useAppDispatch, useAppSelector } from '@/app/store/hooks'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { PageLoader } from '@/components/shared/PageLoader'
import { Button } from '@/components/ui/button'
import { useQuoteCartQuery } from '@/features/cart/api/cartApi'
import {
  itemRemoved,
  itemsRemoved,
  MAX_QUANTITY_PER_ITEM,
  quantityChanged,
  selectCartItems,
} from '@/features/cart/cartSlice'
import { CartSummary } from '@/features/cart/components/CartSummary'
import type { CartLine } from '@/features/cart/types'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { cn } from '@/lib/utils/cn'
import { formatPrice } from '@/lib/utils/formatPrice'

export function CartPage() {
  const dispatch = useAppDispatch()
  const items = useAppSelector(selectCartItems)
  const {
    data: quote,
    error,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuoteCartQuery({ items }, { skip: items.length === 0 })

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <title>Carrito | Nexora</title>
        <h1 className="mb-6 text-3xl font-bold tracking-tight">Carrito</h1>
        <EmptyState
          title="Tu carrito está vacío"
          description="Explora el catálogo y añade los productos que te interesen."
          action={
            <Button asChild>
              <Link to="/products">Ver catálogo</Link>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <title>Carrito | Nexora</title>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Carrito</h1>

      {isLoading ? (
        <PageLoader />
      ) : isError || !quote ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section
            aria-label="Productos en el carrito"
            aria-busy={isFetching}
            className="flex flex-col gap-4"
          >
            {quote.unavailableVariantIds.length > 0 && (
              <div className="flex flex-col items-start gap-2">
                <FormAlert message="Algunos productos de tu carrito ya no están a la venta." />
                <Button
                  variant="outline"
                  onClick={() => dispatch(itemsRemoved(quote.unavailableVariantIds))}
                >
                  Quitar productos no disponibles
                </Button>
              </div>
            )}

            <ul
              className={cn('flex flex-col divide-y rounded-xl border', isFetching && 'opacity-70')}
            >
              {quote.lines.map((line) => (
                <CartLineItem
                  key={line.variantId}
                  line={line}
                  onQuantityChange={(quantity) =>
                    dispatch(quantityChanged({ variantId: line.variantId, quantity }))
                  }
                  onRemove={() => dispatch(itemRemoved(line.variantId))}
                />
              ))}
            </ul>
          </section>

          <div className="lg:sticky lg:top-24 lg:self-start">
            <CartSummary quote={quote}>
              {quote.canCheckout ? (
                <Button asChild size="lg" className="h-11">
                  <Link to="/checkout">Continuar con la compra</Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" className="h-11" disabled>
                    Continuar con la compra
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Ajusta las cantidades o quita los productos sin stock para continuar.
                  </p>
                </>
              )}
            </CartSummary>
          </div>
        </div>
      )}
    </div>
  )
}

interface CartLineItemProps {
  line: CartLine
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}

function CartLineItem({ line, onQuantityChange, onRemove }: CartLineItemProps) {
  const selectId = `quantity-${line.variantId}`
  // Offer at least the current quantity so the select never shows an invalid value.
  const maxOption = Math.max(line.quantity, Math.min(line.maxQuantity, MAX_QUANTITY_PER_ITEM), 1)

  return (
    <li className="flex gap-4 p-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
        {line.image && (
          <img
            src={line.image.url}
            alt=""
            width={line.image.width}
            height={line.image.height}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to={`/products/${line.productSlug}`} className="font-medium hover:underline">
              {line.productName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {line.variantName} · SKU {line.sku}
            </p>
          </div>
          <p className="font-semibold">{formatPrice(line.lineTotal)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor={selectId} className="text-muted-foreground">
            Cantidad
          </label>
          <select
            id={selectId}
            value={line.quantity}
            onChange={(event) => {
              onQuantityChange(Number(event.target.value))
            }}
            className="h-9 rounded-lg border border-input bg-background px-2 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Array.from({ length: maxOption }, (_, index) => index + 1).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">× {formatPrice(line.unitPrice)}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            aria-label={`Quitar ${line.productName} (${line.variantName}) del carrito`}
            className="ml-auto"
          >
            <Trash2 aria-hidden="true" />
            Quitar
          </Button>
        </div>

        {!line.isAvailable && (
          <p className="text-sm font-medium text-destructive">
            {line.maxQuantity === 0
              ? 'Agotado: quita este producto para continuar.'
              : line.maxQuantity === 1
                ? 'Solo queda 1 unidad disponible.'
                : `Solo quedan ${String(line.maxQuantity)} unidades disponibles.`}
          </p>
        )}
      </div>
    </li>
  )
}

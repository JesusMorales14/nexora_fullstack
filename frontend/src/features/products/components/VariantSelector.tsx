import type { ProductVariant } from '@/features/products/types'
import { formatPrice } from '@/lib/utils/formatPrice'
import { cn } from '@/lib/utils/cn'

interface VariantSelectorProps {
  variants: ProductVariant[]
  selectedVariantId: string
  onChange: (variantId: string) => void
}

/** Native radio group: arrow-key navigation and screen reader semantics for free. */
export function VariantSelector({ variants, selectedVariantId, onChange }: VariantSelectorProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">Elige una opción</legend>
      {variants.map((variant) => (
        <label
          key={variant.id}
          className={cn(
            'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
            variant.id === selectedVariantId ? 'border-primary bg-accent' : 'hover:bg-muted',
          )}
        >
          <span className="flex items-center gap-3">
            <input
              type="radio"
              name="variant"
              value={variant.id}
              checked={variant.id === selectedVariantId}
              onChange={() => {
                onChange(variant.id)
              }}
              className="size-4 accent-primary"
            />
            <span>
              {variant.name}
              {!variant.isInStock && <span className="text-muted-foreground"> · Agotado</span>}
            </span>
          </span>
          <span className="font-medium">{formatPrice(variant.price)}</span>
        </label>
      ))}
    </fieldset>
  )
}

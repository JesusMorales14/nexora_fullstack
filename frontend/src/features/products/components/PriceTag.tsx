import { formatPrice } from '@/lib/utils/formatPrice'
import { cn } from '@/lib/utils/cn'

interface PriceTagProps {
  price: number
  compareAtPrice: number | null
  size?: 'default' | 'large'
}

export function PriceTag({ price, compareAtPrice, size = 'default' }: PriceTagProps) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className={cn('font-semibold', size === 'large' ? 'text-3xl' : 'text-lg')}>
        {formatPrice(price)}
      </span>
      {compareAtPrice !== null && (
        <span className="text-sm text-muted-foreground line-through">
          <span className="sr-only">Precio anterior: </span>
          {formatPrice(compareAtPrice)}
        </span>
      )}
    </p>
  )
}

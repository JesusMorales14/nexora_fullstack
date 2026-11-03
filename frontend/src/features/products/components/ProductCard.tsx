import { Link } from 'react-router'

import { PriceTag } from '@/features/products/components/PriceTag'
import { StockBadge } from '@/features/products/components/StockBadge'
import type { ProductSummary } from '@/features/products/types'

interface ProductCardProps {
  product: ProductSummary
  /** Above-the-fold cards load their image eagerly to help LCP. */
  isPriority?: boolean
}

export function ProductCard({ product, isPriority = false }: ProductCardProps) {
  const productUrl = `/products/${product.slug}`

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow focus-within:ring-3 focus-within:ring-ring/50 hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-muted">
        {product.primaryImage && (
          <img
            src={product.primaryImage.url}
            // Decorative here: the product name right below already identifies it.
            alt=""
            width={product.primaryImage.width}
            height={product.primaryImage.height}
            loading={isPriority ? 'eager' : 'lazy'}
            fetchPriority={isPriority ? 'high' : 'auto'}
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {product.brandName}
        </p>
        <h3 className="font-medium leading-snug">
          {/* The stretched link makes the whole card clickable with a single tab stop. */}
          <Link to={productUrl} className="outline-none after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
          <StockBadge isInStock={product.isInStock} />
        </div>
      </div>
    </article>
  )
}

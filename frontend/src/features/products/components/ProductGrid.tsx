import { ProductCard } from '@/features/products/components/ProductCard'
import type { ProductSummary } from '@/features/products/types'
import { Skeleton } from '@/components/ui/skeleton'

const PRIORITY_IMAGE_COUNT = 4
const GRID_CLASS_NAME = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4'

interface ProductGridProps {
  products: ProductSummary[]
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <ul className={GRID_CLASS_NAME}>
      {products.map((product, index) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} isPriority={index < PRIORITY_IMAGE_COUNT} />
        </li>
      ))}
    </ul>
  )
}

interface ProductGridSkeletonProps {
  count: number
}

export function ProductGridSkeleton({ count }: ProductGridSkeletonProps) {
  return (
    <div role="status" className={GRID_CLASS_NAME}>
      <span className="sr-only">Cargando productos…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex flex-col gap-3 rounded-xl border p-0">
          <Skeleton className="aspect-square rounded-b-none" />
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}

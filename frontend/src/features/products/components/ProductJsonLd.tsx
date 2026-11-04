import type { ProductDetails } from '@/features/products/types'
import { buildProductJsonLd } from '@/lib/seo/seo'

export function ProductJsonLd({ product }: { product: ProductDetails }) {
  const json = buildProductJsonLd(product, `/products/${encodeURIComponent(product.slug)}`)
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

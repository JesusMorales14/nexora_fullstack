import type { ProductDetails } from '@/features/products/types'

export function toAbsoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, window.location.origin).toString()
}

/**
 * Removes the metadata that came in the HTML (index.html defaults and the tags the API injects for
 * crawlers): once the SPA runs, each page renders its own and duplicates would confuse crawlers.
 */
export function removeStaticHeadMetadata(head: HTMLHeadElement = document.head) {
  head.querySelectorAll('title, [data-server-seo], meta[name="description"]').forEach((element) => {
    element.remove()
  })
}

/**
 * schema.org Product data for rich results. It is a data block (never executed), so the CSP's
 * script-src does not apply; "<" is escaped so a product text can never close the element.
 */
export function buildProductJsonLd(product: ProductDetails, productPath: string): string {
  const prices = product.variants.map((variant) => variant.price)
  const formatPrice = (value: number) => value.toFixed(2)

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.variants[0]?.sku,
    url: toAbsoluteUrl(productPath),
    image: product.images.map((image) => toAbsoluteUrl(image.url)),
    brand: { '@type': 'Brand', name: product.brandName },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: product.currency,
      lowPrice: formatPrice(prices.length > 0 ? Math.min(...prices) : 0),
      highPrice: formatPrice(prices.length > 0 ? Math.max(...prices) : 0),
      offerCount: product.variants.length,
      availability: product.variants.some((variant) => variant.isInStock)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  }

  return JSON.stringify(data).replace(/</g, '\\u003c')
}

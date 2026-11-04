import { describe, expect, it } from 'vitest'

import type { ProductDetails } from '@/features/products/types'
import { buildProductJsonLd, removeStaticHeadMetadata, toAbsoluteUrl } from '@/lib/seo/seo'

const hostileText = '</script><script>alert(1)</script>'

const product: ProductDetails = {
  id: 'p1',
  slug: 'mouse-x',
  name: hostileText,
  description: 'Mouse inalámbrico',
  brandName: 'Logitech',
  brandSlug: 'logitech',
  categoryName: 'Mouse',
  categorySlug: 'mouse',
  currency: 'PEN',
  images: [{ url: '/images/products/mouse.svg', altText: 'Mouse', width: 800, height: 800 }],
  variants: [
    {
      id: 'v1',
      sku: 'MX-1',
      name: 'Negro',
      price: 99.9,
      compareAtPrice: null,
      isInStock: false,
      isLowStock: false,
    },
    {
      id: 'v2',
      sku: 'MX-2',
      name: 'Blanco',
      price: 120,
      compareAtPrice: null,
      isInStock: true,
      isLowStock: true,
    },
  ],
}

describe('buildProductJsonLd', () => {
  it('describes the product with PEN prices and availability', () => {
    const data = JSON.parse(buildProductJsonLd(product, '/products/mouse-x')) as {
      offers: Record<string, unknown>
      image: string[]
      url: string
    }

    expect(data.offers).toMatchObject({
      priceCurrency: 'PEN',
      lowPrice: '99.90',
      highPrice: '120.00',
      offerCount: 2,
      availability: 'https://schema.org/InStock',
    })
    expect(data.url).toBe(`${window.location.origin}/products/mouse-x`)
    expect(data.image).toEqual([`${window.location.origin}/images/products/mouse.svg`])
  })

  it('never emits a raw "<", so product text cannot close the script element', () => {
    const json = buildProductJsonLd(product, '/products/mouse-x')

    expect(json).not.toContain('<')
    expect((JSON.parse(json) as { name: string }).name).toBe(hostileText)
  })
})

describe('toAbsoluteUrl', () => {
  it('keeps absolute URLs and resolves paths against the current origin', () => {
    expect(toAbsoluteUrl('https://cdn.example/a.png')).toBe('https://cdn.example/a.png')
    expect(toAbsoluteUrl('/products')).toBe(`${window.location.origin}/products`)
  })
})

describe('removeStaticHeadMetadata', () => {
  it('drops the HTML defaults and the server-injected tags, keeping everything else', () => {
    const doc = document.implementation.createHTMLDocument('')
    doc.head.innerHTML = `
      <meta charset="utf-8">
      <title>Nexora</title>
      <meta name="description" content="x">
      <link rel="canonical" href="/p" data-server-seo>
      <meta property="og:title" content="x" data-server-seo>
      <link rel="icon" href="/favicon.svg">`

    removeStaticHeadMetadata(doc.head)

    expect(
      doc.head.querySelectorAll('title, [data-server-seo], meta[name="description"]'),
    ).toHaveLength(0)
    expect(doc.head.querySelector('link[rel="icon"]')).not.toBeNull()
    expect(doc.head.querySelector('meta[charset]')).not.toBeNull()
  })
})

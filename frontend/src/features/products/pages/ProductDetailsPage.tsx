import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { ErrorState } from '@/components/shared/ErrorState'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageLoader } from '@/components/shared/PageLoader'
import { PageMeta } from '@/components/shared/PageMeta'
import { useGetProductBySlugQuery } from '@/features/products/api/productsApi'
import { PriceTag } from '@/features/products/components/PriceTag'
import { ProductGallery } from '@/features/products/components/ProductGallery'
import { ProductJsonLd } from '@/features/products/components/ProductJsonLd'
import { StockBadge } from '@/features/products/components/StockBadge'
import { AddToCartForm } from '@/features/cart/components/AddToCartForm'
import { VariantSelector } from '@/features/products/components/VariantSelector'
import type { ProductDetails } from '@/features/products/types'
import { getErrorMessage, getHttpStatus } from '@/lib/api/apiErrors'

const HTTP_NOT_FOUND = 404
const META_DESCRIPTION_MAX_LENGTH = 155

export function ProductDetailsPage() {
  const { slug = '' } = useParams()
  const { data: product, error, isLoading, isError, refetch } = useGetProductBySlugQuery(slug)

  if (isLoading) return <PageLoader />

  if (isError) {
    if (getHttpStatus(error) === HTTP_NOT_FOUND) return <NotFoundPage />

    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!product) return null

  // `key` resets the selected variant when navigating between products.
  return <ProductDetailsView key={product.id} product={product} />
}

interface ProductDetailsViewProps {
  product: ProductDetails
}

function ProductDetailsView({ product }: ProductDetailsViewProps) {
  const defaultVariant =
    product.variants.find((variant) => variant.isInStock) ?? product.variants[0]
  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? '')
  // Derived during render instead of being stored: there is a single source of truth (the id).
  const selectedVariant =
    product.variants.find((variant) => variant.id === selectedVariantId) ?? defaultVariant

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageMeta
        title={`${product.name} | Nexora`}
        description={product.description.slice(0, META_DESCRIPTION_MAX_LENGTH)}
        canonicalPath={`/products/${encodeURIComponent(product.slug)}`}
        type="product"
        imageUrl={product.images[0]?.url}
      />
      <ProductJsonLd product={product} />

      <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link to="/products" className="hover:text-foreground hover:underline">
              Catálogo
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              to={`/products?category=${product.categorySlug}`}
              className="hover:text-foreground hover:underline"
            >
              {product.categoryName}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Link
              to={`/products?brand=${product.brandSlug}`}
              className="w-fit text-sm font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground"
            >
              {product.brandName}
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-balance">{product.name}</h1>
          </div>

          {selectedVariant && (
            <div className="flex flex-col gap-2">
              <PriceTag
                price={selectedVariant.price}
                compareAtPrice={selectedVariant.compareAtPrice}
                size="large"
              />
              <p className="text-xs text-muted-foreground">Precio en soles, IGV incluido.</p>
              <div className="flex items-center gap-3">
                <StockBadge
                  isInStock={selectedVariant.isInStock}
                  isLowStock={selectedVariant.isLowStock}
                />
                <span className="text-xs text-muted-foreground">SKU: {selectedVariant.sku}</span>
              </div>
            </div>
          )}

          {product.variants.length > 1 && (
            <VariantSelector
              variants={product.variants}
              selectedVariantId={selectedVariant?.id ?? ''}
              onChange={setSelectedVariantId}
            />
          )}

          {selectedVariant && (
            <AddToCartForm
              key={selectedVariant.id}
              variantId={selectedVariant.id}
              productName={product.name}
              isInStock={selectedVariant.isInStock}
            />
          )}

          <section aria-labelledby="product-description-heading" className="flex flex-col gap-2">
            <h2 id="product-description-heading" className="text-lg font-semibold">
              Descripción
            </h2>
            <p className="leading-relaxed text-muted-foreground">{product.description}</p>
          </section>
        </div>
      </div>
    </div>
  )
}

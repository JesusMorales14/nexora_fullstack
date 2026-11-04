import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { ErrorState } from '@/components/shared/ErrorState'
import { PageMeta } from '@/components/shared/PageMeta'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetCategoriesQuery, useGetProductsQuery } from '@/features/products/api/productsApi'
import { ProductGrid, ProductGridSkeleton } from '@/features/products/components/ProductGrid'
import { getErrorMessage } from '@/lib/api/apiErrors'

const FEATURED_PRODUCT_COUNT = 4
const CATEGORY_PLACEHOLDERS = ['a', 'b', 'c', 'd']

export function HomePage() {
  // Default "relevance" sort lists featured products first.
  const featured = useGetProductsQuery({ pageSize: FEATURED_PRODUCT_COUNT })
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategoriesQuery()
  const topLevelCategories = categories.filter((category) => category.parentSlug === null)

  return (
    <>
      <PageMeta
        title="Nexora | Tienda de tecnología en Perú"
        description="Laptops, monitores, periféricos, audio y smartphones con precios en soles y envío a todo el Perú."
        canonicalPath="/"
      />

      <section className="border-b bg-gradient-to-b from-accent/60 to-background">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:px-6 sm:py-24">
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Tecnología que te impulsa
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Laptops, componentes y accesorios con envío a todo el Perú.
          </p>
          <Button asChild size="lg">
            <Link to="/products">
              Ver catálogo
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Always rendered with a reserved height: inserting it after the data arrives pushed the
          featured products down (Cumulative Layout Shift). */}
      <section
        aria-labelledby="categories-heading"
        className="mx-auto max-w-7xl px-4 pt-12 sm:px-6"
      >
        <h2 id="categories-heading" className="mb-4 text-xl font-semibold">
          Categorías
        </h2>
        <ul className="flex min-h-[2.375rem] flex-wrap gap-2">
          {isLoadingCategories
            ? CATEGORY_PLACEHOLDERS.map((placeholder) => (
                <li key={placeholder} aria-hidden="true">
                  <Skeleton className="h-[2.375rem] w-28 rounded-full" />
                </li>
              ))
            : topLevelCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    to={`/products?category=${category.slug}`}
                    className="inline-flex rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
        </ul>
      </section>

      <section aria-labelledby="featured-heading" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="featured-heading" className="text-xl font-semibold">
            Destacados
          </h2>
          <Link to="/products" className="text-sm font-medium text-primary hover:underline">
            Ver todo
          </Link>
        </div>
        {featured.isLoading ? (
          <ProductGridSkeleton count={FEATURED_PRODUCT_COUNT} />
        ) : featured.isError ? (
          <ErrorState
            message={getErrorMessage(featured.error)}
            onRetry={() => void featured.refetch()}
          />
        ) : (
          <ProductGrid products={featured.data?.items ?? []} />
        )}
      </section>
    </>
  )
}

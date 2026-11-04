import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/EmptyState'
import { PageMeta } from '@/components/shared/PageMeta'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useGetProductsQuery } from '@/features/products/api/productsApi'
import { CatalogFilters } from '@/features/products/components/CatalogFilters'
import { Pagination } from '@/components/shared/Pagination'
import { ProductGrid, ProductGridSkeleton } from '@/features/products/components/ProductGrid'
import { CATALOG_PAGE_SIZE, useProductFilters } from '@/features/products/hooks/useProductFilters'
import { PRODUCT_SORT_OPTIONS, type ProductListParams } from '@/features/products/types'
import { getErrorMessage } from '@/lib/api/apiErrors'
import { cn } from '@/lib/utils/cn'

const FILTERS_PANEL_ID = 'catalog-filters'

function catalogCanonicalPath(category: string | undefined): string {
  return category ? `/products?category=${encodeURIComponent(category)}` : '/products'
}

/**
 * Only the full catalog and single-category listings (the URLs in the sitemap) are indexed.
 * Searches, filter combinations, sorting and later pages would be near-duplicates.
 */
function isIndexableCatalogView(filters: ProductListParams): boolean {
  return (
    (filters.page ?? 1) === 1 &&
    filters.q === undefined &&
    filters.brand === undefined &&
    filters.minPrice === undefined &&
    filters.maxPrice === undefined &&
    filters.inStock !== true &&
    (filters.sort === undefined || filters.sort === 'relevance')
  )
}

export function CatalogPage() {
  const { filters, setFilters, setPage, clearFilters, hasActiveFilters } = useProductFilters()
  const { data, error, isLoading, isFetching, isError, refetch } = useGetProductsQuery(filters)
  const [areFiltersOpen, setAreFiltersOpen] = useState(false)

  const heading = filters.q ? `Resultados para “${filters.q}”` : 'Catálogo'

  function handlePageChange(page: number) {
    setPage(page)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageMeta
        title={`${heading} | Nexora`}
        description="Explora laptops, monitores, periféricos, audio y smartphones con precios en soles."
        canonicalPath={catalogCanonicalPath(filters.category)}
        noindex={!isIndexableCatalogView(filters)}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
          {/* Announced to screen readers whenever the result count changes. */}
          <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
            {data && `${String(data.totalCount)} productos`}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <Button
            variant="outline"
            className="md:hidden"
            aria-expanded={areFiltersOpen}
            aria-controls={FILTERS_PANEL_ID}
            onClick={() => {
              setAreFiltersOpen((isOpen) => !isOpen)
            }}
          >
            <SlidersHorizontal aria-hidden="true" />
            Filtros
          </Button>
          <div className="flex flex-col gap-1">
            <Label htmlFor="catalog-sort" className="text-xs text-muted-foreground">
              Ordenar por
            </Label>
            <select
              id="catalog-sort"
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={filters.sort ?? 'relevance'}
              onChange={(event) => {
                setFilters({
                  sort: event.target.value === 'relevance' ? undefined : event.target.value,
                })
              }}
            >
              {PRODUCT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside
          id={FILTERS_PANEL_ID}
          aria-label="Filtros"
          className={cn(areFiltersOpen ? 'block' : 'hidden', 'md:block')}
        >
          <CatalogFilters />
        </aside>

        <section
          aria-labelledby="catalog-results-heading"
          aria-busy={isFetching}
          className="flex flex-col gap-8"
        >
          {/* Keeps the heading outline h1 → h2 → h3 (product cards) for screen reader navigation. */}
          <h2 id="catalog-results-heading" className="sr-only">
            Productos
          </h2>
          {isLoading ? (
            <ProductGridSkeleton count={CATALOG_PAGE_SIZE} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
          ) : data && data.items.length > 0 ? (
            <>
              <div className={cn('transition-opacity', isFetching && 'opacity-60')}>
                <ProductGrid products={data.items} />
              </div>
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          ) : (
            <EmptyState
              title="No encontramos productos"
              description="Prueba con otra búsqueda o quita algunos filtros."
              action={
                hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                )
              }
            />
          )}
        </section>
      </div>
    </div>
  )
}

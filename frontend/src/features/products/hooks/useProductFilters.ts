import { useSearchParams } from 'react-router'

import {
  PRODUCT_SORT_OPTIONS,
  type ProductListParams,
  type ProductSort,
} from '@/features/products/types'

export const CATALOG_PAGE_SIZE = 12

type FilterKey = 'q' | 'category' | 'brand' | 'minPrice' | 'maxPrice' | 'inStock' | 'sort'

const SORT_VALUES = new Set<string>(PRODUCT_SORT_OPTIONS.map((option) => option.value))

function isProductSort(value: string): value is ProductSort {
  return SORT_VALUES.has(value)
}

function parsePositiveInteger(value: string | null): number | undefined {
  if (value === null) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined
}

function parsePrice(value: string | null): number | undefined {
  if (value === null || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

/** Reads the catalog filters from the URL. Invalid values are ignored instead of breaking the page. */
export function parseProductFilters(searchParams: URLSearchParams): ProductListParams {
  const sort = searchParams.get('sort')
  const search = searchParams.get('q')?.trim() ?? ''

  return {
    page: parsePositiveInteger(searchParams.get('page')) ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
    q: search === '' ? undefined : search,
    category: searchParams.get('category') ?? undefined,
    brand: searchParams.get('brand') ?? undefined,
    minPrice: parsePrice(searchParams.get('minPrice')),
    maxPrice: parsePrice(searchParams.get('maxPrice')),
    inStock: searchParams.get('inStock') === 'true' ? true : undefined,
    sort: sort !== null && isProductSort(sort) ? sort : undefined,
  }
}

/**
 * Catalog filters live in the URL (not Redux): links are shareable, the back button works,
 * and RTK Query caches each combination by its arguments.
 */
export function useProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = parseProductFilters(searchParams)

  function setFilters(changes: Partial<Record<FilterKey, string | undefined>>) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      for (const key of Object.keys(changes) as FilterKey[]) {
        const value = changes[key]
        if (value === undefined || value === '') next.delete(key)
        else next.set(key, value)
      }
      // Any filter change invalidates the current page number.
      next.delete('page')
      return next
    })
  }

  function setPage(page: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (page <= 1) next.delete('page')
      else next.set('page', String(page))
      return next
    })
  }

  function clearFilters() {
    setSearchParams(new URLSearchParams())
  }

  const hasActiveFilters = [...searchParams.keys()].some((key) => key !== 'page' && key !== 'sort')

  return { filters, setFilters, setPage, clearFilters, hasActiveFilters }
}

import { describe, expect, it } from 'vitest'

import { CATALOG_PAGE_SIZE, parseProductFilters } from '@/features/products/hooks/useProductFilters'

describe('parseProductFilters', () => {
  it('returns defaults for an empty query string', () => {
    expect(parseProductFilters(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: CATALOG_PAGE_SIZE,
      q: undefined,
      category: undefined,
      brand: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      sort: undefined,
    })
  })

  it('parses valid filters from the URL', () => {
    const filters = parseProductFilters(
      new URLSearchParams(
        'page=2&q=%20mouse%20&category=mouse&brand=logitech&minPrice=100&maxPrice=500&inStock=true&sort=price_asc',
      ),
    )

    expect(filters).toMatchObject({
      page: 2,
      q: 'mouse',
      category: 'mouse',
      brand: 'logitech',
      minPrice: 100,
      maxPrice: 500,
      inStock: true,
      sort: 'price_asc',
    })
  })

  it('ignores tampered values instead of sending them to the API', () => {
    const filters = parseProductFilters(
      new URLSearchParams('page=-3&minPrice=abc&maxPrice=-1&inStock=yes&sort=cheapest'),
    )

    expect(filters).toMatchObject({
      page: 1,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      sort: undefined,
    })
  })
})

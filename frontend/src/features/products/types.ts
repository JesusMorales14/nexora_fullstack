// Mirrors the API contracts in Nexora.Application.Catalog.CatalogResponses.
// Prices are numbers in soles (PEN), IGV included.

export interface ProductImage {
  url: string
  altText: string
  width: number
  height: number
}

export interface ProductSummary {
  id: string
  slug: string
  name: string
  brandName: string
  categorySlug: string
  primaryImage: ProductImage | null
  price: number
  compareAtPrice: number | null
  currency: 'PEN'
  isInStock: boolean
}

export interface ProductVariant {
  id: string
  sku: string
  name: string
  price: number
  compareAtPrice: number | null
  isInStock: boolean
  isLowStock: boolean
}

export interface ProductDetails {
  id: string
  slug: string
  name: string
  description: string
  brandName: string
  brandSlug: string
  categoryName: string
  categorySlug: string
  currency: 'PEN'
  images: ProductImage[]
  variants: ProductVariant[]
}

export interface Category {
  id: string
  name: string
  slug: string
  parentSlug: string | null
}

export interface Brand {
  id: string
  name: string
  slug: string
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export const PRODUCT_SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre: A–Z' },
] as const

export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number]['value']

/** Query-string parameters accepted by GET /products. */
export interface ProductListParams {
  page?: number
  pageSize?: number
  q?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  sort?: ProductSort
}

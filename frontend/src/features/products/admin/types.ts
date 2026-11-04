// Mirrors Nexora.Application.Admin.AdminCatalogContracts.

export interface AdminProductListItem {
  id: string
  name: string
  slug: string
  brandName: string
  categoryName: string
  isPublished: boolean
  isFeatured: boolean
  variantCount: number
  minPrice: number | null
  availableUnits: number
  updatedAt: string
}

export interface AdminVariant {
  id: string
  sku: string
  name: string
  price: number
  compareAtPrice: number | null
  onHand: number
  reserved: number
  available: number
  lowStockThreshold: number
}

export interface AdminImage {
  id: string
  url: string
  altText: string
  width: number
  height: number
}

export interface AdminProductDetails {
  id: string
  name: string
  slug: string
  description: string
  categoryId: string
  brandId: string
  isPublished: boolean
  isFeatured: boolean
  /** Concurrency token: sent back on update; a stale value gets a 409. */
  version: number
  updatedAt: string
  variants: AdminVariant[]
  images: AdminImage[]
}

export interface VariantInput {
  sku: string
  name: string
  price: number
  compareAtPrice: number | null
  initialStock: number
  lowStockThreshold: number
}

export interface ImageInput {
  url: string
  altText: string
  width: number
  height: number
}

export interface ProductDetailsInput {
  name: string
  slug: string
  description: string
  categoryId: string
  brandId: string
  isPublished: boolean
  isFeatured: boolean
}

export interface CreateProductRequest extends ProductDetailsInput {
  variant: VariantInput
  image?: ImageInput
}

export interface UpdateProductRequest extends ProductDetailsInput {
  version: number
}

export interface UpdateVariantRequest {
  name: string
  price: number
  compareAtPrice: number | null
  lowStockThreshold: number
}

export interface AdminProductListParams {
  page?: number
  q?: string
  categoryId?: string
  status?: 'published' | 'draft'
}

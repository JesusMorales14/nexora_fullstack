import type { AdminProductDetails } from '@/features/products/admin/types'

export const CATEGORY_ID = '0193a1c2-0000-7000-8000-0000000000c1'
export const BRAND_ID = '0193a1c2-0000-7000-8000-0000000000b1'
export const PRODUCT_ID = '0193a1c2-0000-7000-8000-0000000000p1'
export const ADMIN_VARIANT_ID = '0193a1c2-0000-7000-8000-0000000000v1'

export const adminCategoriesFixture = [
  { id: CATEGORY_ID, name: 'Laptops', slug: 'laptops', parentId: null, productCount: 4 },
]

export const adminBrandsFixture = [
  { id: BRAND_ID, name: 'Lenovo', slug: 'lenovo', productCount: 2 },
]

export function adminProductFixture(
  overrides: Partial<AdminProductDetails> = {},
): AdminProductDetails {
  return {
    id: PRODUCT_ID,
    name: 'Laptop Pro 14',
    slug: 'laptop-pro-14',
    description: 'Laptop de prueba.',
    categoryId: CATEGORY_ID,
    brandId: BRAND_ID,
    isPublished: false,
    isFeatured: false,
    version: 1001,
    updatedAt: '2026-11-03T15:00:00Z',
    variants: [
      {
        id: ADMIN_VARIANT_ID,
        sku: 'LAP-PRO-14',
        name: '16 GB',
        price: 3999,
        compareAtPrice: null,
        onHand: 5,
        reserved: 1,
        available: 4,
        lowStockThreshold: 5,
      },
    ],
    images: [],
    ...overrides,
  }
}

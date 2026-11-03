import type {
  Brand,
  Category,
  PagedResponse,
  ProductDetails,
  ProductSummary,
} from '@/features/products/types'

const image = (name: string) => ({
  url: '/images/products/mouse.svg',
  altText: name,
  width: 800,
  height: 800,
})

export const categoriesFixture: Category[] = [
  { id: 'c1', name: 'Periféricos', slug: 'perifericos', parentSlug: null },
  { id: 'c2', name: 'Mouse', slug: 'mouse', parentSlug: 'perifericos' },
  { id: 'c3', name: 'Audio', slug: 'audio', parentSlug: null },
]

export const brandsFixture: Brand[] = [
  { id: 'b1', name: 'Logitech', slug: 'logitech' },
  { id: 'b2', name: 'Sony', slug: 'sony' },
]

export const productSummariesFixture: ProductSummary[] = [
  {
    id: 'p1',
    slug: 'logitech-mx-master-3s',
    name: 'Logitech MX Master 3S',
    brandName: 'Logitech',
    categorySlug: 'mouse',
    primaryImage: image('Logitech MX Master 3S'),
    price: 449,
    compareAtPrice: 499,
    currency: 'PEN',
    isInStock: true,
  },
  {
    id: 'p2',
    slug: 'sony-wh-1000xm5',
    name: 'Sony WH-1000XM5',
    brandName: 'Sony',
    categorySlug: 'audio',
    primaryImage: image('Sony WH-1000XM5'),
    price: 1399,
    compareAtPrice: null,
    currency: 'PEN',
    isInStock: false,
  },
]

export function pageOf(
  items: ProductSummary[],
  page = 1,
  pageSize = 12,
): PagedResponse<ProductSummary> {
  return {
    items,
    page,
    pageSize,
    totalCount: items.length,
    totalPages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
  }
}

export const productDetailsFixture: ProductDetails = {
  id: 'p3',
  slug: 'samsung-galaxy-s25',
  name: 'Samsung Galaxy S25',
  description: 'Flagship compacto con funciones de IA integradas.',
  brandName: 'Samsung',
  brandSlug: 'samsung',
  categoryName: 'Smartphones',
  categorySlug: 'smartphones',
  currency: 'PEN',
  images: [image('Samsung Galaxy S25')],
  variants: [
    {
      id: 'v1',
      sku: 'SAM-S25-12-256',
      name: '12 GB / 256 GB',
      price: 3699,
      compareAtPrice: 4199,
      isInStock: true,
      isLowStock: false,
    },
    {
      id: 'v2',
      sku: 'SAM-S25-12-512',
      name: '12 GB / 512 GB',
      price: 4199,
      compareAtPrice: null,
      isInStock: true,
      isLowStock: true,
    },
  ],
}

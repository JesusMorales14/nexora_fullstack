import type {
  Brand,
  Category,
  PagedResponse,
  ProductDetails,
  ProductListParams,
  ProductSummary,
} from '@/features/products/types'
import { baseApi } from '@/lib/api/baseApi'

export const productsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<PagedResponse<ProductSummary>, ProductListParams>({
      // RTK Query drops undefined values, so only active filters reach the query string.
      query: (params) => ({ url: 'products', params }),
      providesTags: (result) => [
        { type: 'Product', id: 'LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Product' as const, id })) ?? []),
      ],
    }),
    getProductBySlug: build.query<ProductDetails, string>({
      query: (slug) => `products/${encodeURIComponent(slug)}`,
      providesTags: (result) => (result ? [{ type: 'Product', id: result.id }] : []),
    }),
    getCategories: build.query<Category[], void>({
      query: () => 'categories',
      providesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    getBrands: build.query<Brand[], void>({
      query: () => 'brands',
      providesTags: [{ type: 'Brand', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductBySlugQuery,
  useGetCategoriesQuery,
  useGetBrandsQuery,
} = productsApi

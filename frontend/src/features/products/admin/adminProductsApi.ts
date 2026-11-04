import type {
  AdminProductDetails,
  AdminProductListItem,
  AdminProductListParams,
  CreateProductRequest,
  ImageInput,
  UpdateProductRequest,
  UpdateVariantRequest,
  VariantInput,
} from '@/features/products/admin/types'
import type { PagedResponse } from '@/features/products/types'
import { baseApi } from '@/lib/api/baseApi'

const ADMIN_PAGE_SIZE = 20

// Admin changes also invalidate the public catalog cache so the storefront never shows stale data.
const PUBLIC_CATALOG = { type: 'Product', id: 'LIST' } as const

export const adminProductsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminProducts: build.query<PagedResponse<AdminProductListItem>, AdminProductListParams>({
      query: (params) => ({
        url: 'admin/products',
        params: { ...params, pageSize: ADMIN_PAGE_SIZE },
      }),
      providesTags: [{ type: 'AdminProduct', id: 'LIST' }],
    }),
    getAdminProduct: build.query<AdminProductDetails, string>({
      query: (id) => `admin/products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'AdminProduct', id }],
    }),
    createProduct: build.mutation<AdminProductDetails, CreateProductRequest>({
      query: (body) => ({ url: 'admin/products', method: 'POST', body }),
      invalidatesTags: [
        { type: 'AdminProduct', id: 'LIST' },
        PUBLIC_CATALOG,
        'AdminInventory',
        'AuditLog',
      ],
    }),
    updateProduct: build.mutation<AdminProductDetails, { id: string; body: UpdateProductRequest }>({
      query: ({ id, body }) => ({ url: `admin/products/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'AdminProduct', id },
        { type: 'AdminProduct', id: 'LIST' },
        PUBLIC_CATALOG,
        'AuditLog',
      ],
    }),
    addVariant: build.mutation<AdminProductDetails, { productId: string; body: VariantInput }>({
      query: ({ productId, body }) => ({
        url: `admin/products/${productId}/variants`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'AdminProduct', id: productId },
        { type: 'AdminProduct', id: 'LIST' },
        PUBLIC_CATALOG,
        'AdminInventory',
        'AuditLog',
      ],
    }),
    updateVariant: build.mutation<
      AdminProductDetails,
      { productId: string; variantId: string; body: UpdateVariantRequest }
    >({
      query: ({ productId, variantId, body }) => ({
        url: `admin/products/${productId}/variants/${variantId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'AdminProduct', id: productId },
        { type: 'AdminProduct', id: 'LIST' },
        PUBLIC_CATALOG,
        'AdminInventory',
        'AuditLog',
      ],
    }),
    addImage: build.mutation<AdminProductDetails, { productId: string; body: ImageInput }>({
      query: ({ productId, body }) => ({
        url: `admin/products/${productId}/images`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'AdminProduct', id: productId },
        PUBLIC_CATALOG,
        'AuditLog',
      ],
    }),
    removeImage: build.mutation<AdminProductDetails, { productId: string; imageId: string }>({
      query: ({ productId, imageId }) => ({
        url: `admin/products/${productId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { productId }) => [
        { type: 'AdminProduct', id: productId },
        PUBLIC_CATALOG,
        'AuditLog',
      ],
    }),
  }),
})

export const {
  useGetAdminProductsQuery,
  useGetAdminProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useAddVariantMutation,
  useUpdateVariantMutation,
  useAddImageMutation,
  useRemoveImageMutation,
} = adminProductsApi

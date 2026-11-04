import { baseApi } from '@/lib/api/baseApi'

export interface AdminCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
  productCount: number
}

export interface AdminBrand {
  id: string
  name: string
  slug: string
  productCount: number
}

export interface CategoryInput {
  name: string
  slug: string
  parentId: string | null
}

export interface BrandInput {
  name: string
  slug: string
}

const PUBLIC_CATEGORIES = { type: 'Category', id: 'LIST' } as const
const PUBLIC_BRANDS = { type: 'Brand', id: 'LIST' } as const

export const adminCategoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminCategories: build.query<AdminCategory[], void>({
      query: () => 'admin/categories',
      providesTags: ['AdminCategory'],
    }),
    createCategory: build.mutation<AdminCategory, CategoryInput>({
      query: (body) => ({ url: 'admin/categories', method: 'POST', body }),
      invalidatesTags: ['AdminCategory', PUBLIC_CATEGORIES, 'AuditLog'],
    }),
    updateCategory: build.mutation<AdminCategory, { id: string; body: CategoryInput }>({
      query: ({ id, body }) => ({ url: `admin/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: ['AdminCategory', PUBLIC_CATEGORIES, 'AuditLog'],
    }),
    deleteCategory: build.mutation<void, string>({
      query: (id) => ({ url: `admin/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminCategory', PUBLIC_CATEGORIES, 'AuditLog'],
    }),
    getAdminBrands: build.query<AdminBrand[], void>({
      query: () => 'admin/brands',
      providesTags: ['AdminBrand'],
    }),
    createBrand: build.mutation<AdminBrand, BrandInput>({
      query: (body) => ({ url: 'admin/brands', method: 'POST', body }),
      invalidatesTags: ['AdminBrand', PUBLIC_BRANDS, 'AuditLog'],
    }),
  }),
})

export const {
  useGetAdminCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAdminBrandsQuery,
  useCreateBrandMutation,
} = adminCategoriesApi

import { baseApi } from '@/lib/api/baseApi'

export interface AdminSummary {
  totalProducts: number
  publishedProducts: number
  lowStockVariants: number
  outOfStockVariants: number
  customers: number
}

export const adminApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminSummary: build.query<AdminSummary, void>({
      query: () => 'admin/summary',
      providesTags: ['AdminSummary'],
    }),
  }),
})

export const { useGetAdminSummaryQuery } = adminApi

import type { PagedResponse } from '@/features/products/types'
import { baseApi } from '@/lib/api/baseApi'

export interface AdminCustomer {
  id: string
  email: string
  fullName: string
  createdAt: string
  orderCount: number
  totalSpent: number
  lastOrderAt: string | null
}

export interface Administrator {
  id: string
  email: string
  fullName: string
  isCurrentUser: boolean
}

const PAGE_SIZE = 20

export const adminCustomersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminCustomers: build.query<PagedResponse<AdminCustomer>, { page?: number; q?: string }>({
      query: (params) => ({ url: 'admin/customers', params: { ...params, pageSize: PAGE_SIZE } }),
      providesTags: ['AdminCustomer'],
    }),
    getAdministrators: build.query<Administrator[], void>({
      query: () => 'admin/administrators',
      providesTags: ['Administrator'],
    }),
    grantAdministrator: build.mutation<Administrator, { email: string }>({
      query: (body) => ({ url: 'admin/administrators', method: 'POST', body }),
      invalidatesTags: ['Administrator', 'AuditLog'],
    }),
    revokeAdministrator: build.mutation<void, string>({
      query: (userId) => ({ url: `admin/administrators/${userId}`, method: 'DELETE' }),
      invalidatesTags: ['Administrator', 'AuditLog'],
    }),
  }),
})

export const {
  useGetAdminCustomersQuery,
  useGetAdministratorsQuery,
  useGrantAdministratorMutation,
  useRevokeAdministratorMutation,
} = adminCustomersApi

import type { Order, OrderStatus } from '@/features/orders/types'
import type { PagedResponse } from '@/features/products/types'
import { baseApi } from '@/lib/api/baseApi'

export interface AdminOrderListItem {
  orderNumber: string
  status: OrderStatus
  customerEmail: string
  customerName: string
  createdAt: string
  itemCount: number
  total: number
}

export type OrderTransition = 'Shipped' | 'Delivered' | 'Cancelled'

export interface AdminOrderDetails {
  order: Order
  customerEmail: string
  customerName: string
  shippedAt: string | null
  allowedTransitions: OrderTransition[]
}

export interface AdminOrderListParams {
  page?: number
  q?: string
  status?: OrderStatus
}

const PAGE_SIZE = 20

export const adminOrdersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAdminOrders: build.query<PagedResponse<AdminOrderListItem>, AdminOrderListParams>({
      query: (params) => ({ url: 'admin/orders', params: { ...params, pageSize: PAGE_SIZE } }),
      providesTags: [{ type: 'AdminOrder', id: 'LIST' }],
    }),
    getAdminOrder: build.query<AdminOrderDetails, string>({
      query: (orderNumber) => `admin/orders/${encodeURIComponent(orderNumber)}`,
      providesTags: (_result, _error, orderNumber) => [{ type: 'AdminOrder', id: orderNumber }],
    }),
    changeOrderStatus: build.mutation<
      AdminOrderDetails,
      { orderNumber: string; status: OrderTransition }
    >({
      query: ({ orderNumber, status }) => ({
        url: `admin/orders/${encodeURIComponent(orderNumber)}/status`,
        method: 'POST',
        body: { status },
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'AdminOrder', id: orderNumber },
        { type: 'AdminOrder', id: 'LIST' },
        { type: 'Order', id: orderNumber },
        'AdminInventory',
        'AdminSummary',
        'AuditLog',
      ],
    }),
  }),
})

export const { useGetAdminOrdersQuery, useGetAdminOrderQuery, useChangeOrderStatusMutation } =
  adminOrdersApi

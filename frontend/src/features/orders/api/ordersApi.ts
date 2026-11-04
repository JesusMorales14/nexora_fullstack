import type {
  CheckoutRequest,
  CheckoutResponse,
  Order,
  OrderSummary,
} from '@/features/orders/types'
import { baseApi } from '@/lib/api/baseApi'

const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key'

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query<OrderSummary[], void>({
      query: () => 'orders',
      providesTags: [{ type: 'Order', id: 'LIST' }],
    }),
    getOrder: build.query<Order, string>({
      query: (orderNumber) => `orders/${encodeURIComponent(orderNumber)}`,
      providesTags: (_result, _error, orderNumber) => [{ type: 'Order', id: orderNumber }],
    }),
    /**
     * Never retried automatically. The caller keeps the same idempotency key when the outcome is
     * unknown (network error), so a manual retry cannot create a second order.
     */
    placeOrder: build.mutation<
      CheckoutResponse,
      { request: CheckoutRequest; idempotencyKey: string }
    >({
      query: ({ request, idempotencyKey }) => ({
        url: 'checkout',
        method: 'POST',
        body: request,
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
      }),
      invalidatesTags: [
        { type: 'Order', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    simulatePayment: build.mutation<Order, { orderNumber: string; approved: boolean }>({
      query: ({ orderNumber, approved }) => ({
        url: `orders/${encodeURIComponent(orderNumber)}/simulated-payment`,
        method: 'POST',
        body: { approved },
      }),
      invalidatesTags: (_result, _error, { orderNumber }) => [
        { type: 'Order', id: orderNumber },
        { type: 'Order', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetOrdersQuery,
  useGetOrderQuery,
  usePlaceOrderMutation,
  useSimulatePaymentMutation,
} = ordersApi

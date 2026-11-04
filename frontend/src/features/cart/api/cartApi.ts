import type { CartQuote, CartQuoteRequest } from '@/features/cart/types'
import { baseApi } from '@/lib/api/baseApi'

export const cartApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * A query even though it is a POST: it has no side effects and its result is cached per
     * cart contents, so RTK Query refetches automatically whenever the cart changes.
     */
    quoteCart: build.query<CartQuote, CartQuoteRequest>({
      query: (body) => ({ url: 'cart/quote', method: 'POST', body }),
      providesTags: [{ type: 'Product', id: 'LIST' }],
    }),
  }),
})

export const { useQuoteCartQuery } = cartApi

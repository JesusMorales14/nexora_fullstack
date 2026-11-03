import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const DEFAULT_API_BASE_URL = '/api/v1'
const REQUEST_TIMEOUT_MS = 15_000

/**
 * Single RTK Query API slice for the whole app. Features add their endpoints with
 * `baseApi.injectEndpoints(...)` so caching, tags and middleware live in one place.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
    // Session cookies (ASP.NET Core Identity) must travel with every request.
    credentials: 'include',
    timeout: REQUEST_TIMEOUT_MS,
  }),
  tagTypes: ['Product', 'Category', 'Brand'],
  endpoints: () => ({}),
})

import {
  type BaseQueryFn,
  createApi,
  type FetchArgs,
  fetchBaseQuery,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'

const DEFAULT_API_BASE_URL = '/api/v1'
const REQUEST_TIMEOUT_MS = 15_000
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN'
const CSRF_FAILURE_TITLE = 'Invalid antiforgery token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  // Session cookies (ASP.NET Core Identity) must travel with every request.
  credentials: 'include',
  timeout: REQUEST_TIMEOUT_MS,
})

/**
 * Antiforgery token, kept only in memory (never in Redux or localStorage). It is bound to the
 * identity on the server, so it is discarded after login, register and logout.
 */
let csrfToken: string | null = null

export function clearCsrfToken() {
  csrfToken = null
}

function isCsrfTokenResponse(value: unknown): value is { token: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'token' in value &&
    typeof value.token === 'string'
  )
}

function isCsrfFailure(error: FetchBaseQueryError | undefined): boolean {
  return (
    error?.status === 400 &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'title' in error.data &&
    error.data.title === CSRF_FAILURE_TITLE
  )
}

/** Copies any of the header shapes FetchArgs accepts and adds one more header. */
function withHeader(init: FetchArgs['headers'], name: string, value: string): Headers {
  const headers = new Headers()
  if (init instanceof Headers) {
    init.forEach((headerValue, headerName) => {
      headers.set(headerName, headerValue)
    })
  } else if (Array.isArray(init)) {
    for (const [headerName, headerValue] of init) {
      if (headerName !== undefined && headerValue !== undefined)
        headers.set(headerName, headerValue)
    }
  } else if (init) {
    for (const [headerName, headerValue] of Object.entries(init)) {
      if (headerValue !== undefined) headers.set(headerName, headerValue)
    }
  }
  headers.set(name, value)
  return headers
}

/** Adds the antiforgery header to unsafe requests, fetching a token on demand. */
const baseQueryWithCsrf: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const request = typeof args === 'string' ? { url: args } : args
  const method = (request.method ?? 'GET').toUpperCase()

  if (SAFE_METHODS.has(method)) {
    return rawBaseQuery(request, api, extraOptions)
  }

  async function sendWithToken() {
    if (csrfToken === null) {
      const tokenResult = await rawBaseQuery('auth/csrf', api, extraOptions)
      if (tokenResult.error) return tokenResult
      if (!isCsrfTokenResponse(tokenResult.data)) {
        return { error: { status: 'CUSTOM_ERROR', error: 'Invalid CSRF token response' } as const }
      }
      csrfToken = tokenResult.data.token
    }

    const headers = withHeader(request.headers, CSRF_HEADER_NAME, csrfToken)
    return rawBaseQuery({ ...request, headers }, api, extraOptions)
  }

  const result = await sendWithToken()

  // A stale token is rejected before the action runs, so a single retry cannot duplicate effects.
  if (isCsrfFailure(result.error)) {
    clearCsrfToken()
    return sendWithToken()
  }

  return result
}

/**
 * Single RTK Query API slice for the whole app. Features add their endpoints with
 * `baseApi.injectEndpoints(...)` so caching, tags and middleware live in one place.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithCsrf,
  tagTypes: ['Product', 'Category', 'Brand', 'CurrentUser', 'AdminSummary', 'Order'],
  endpoints: () => ({}),
})

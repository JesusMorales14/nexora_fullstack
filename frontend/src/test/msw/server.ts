import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

import {
  brandsFixture,
  categoriesFixture,
  pageOf,
  productDetailsFixture,
  productSummariesFixture,
} from '@/test/msw/catalogFixtures'

/** Absolute API URL used in tests (see `test.env` in vite.config.ts). */
export const TEST_API_URL = 'http://localhost:3000/api/v1'

export const apiUrl = (path: string) => `${TEST_API_URL}/${path}`

/** Happy-path handlers. Individual tests override them with `server.use(...)`. */
export const defaultHandlers = [
  http.get(apiUrl('products'), () => HttpResponse.json(pageOf(productSummariesFixture))),
  http.get(apiUrl('products/:slug'), ({ params }) =>
    params.slug === productDetailsFixture.slug
      ? HttpResponse.json(productDetailsFixture)
      : HttpResponse.json(
          { title: 'Product not found', status: 404 },
          { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
        ),
  ),
  http.get(apiUrl('categories'), () => HttpResponse.json(categoriesFixture)),
  http.get(apiUrl('brands'), () => HttpResponse.json(brandsFixture)),
  // Anonymous visitor by default; tests sign in with `server.use(signedInAs(...))`.
  http.get(apiUrl('auth/me'), () =>
    HttpResponse.json(
      { title: 'Unauthorized', status: 401 },
      { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
    ),
  ),
  http.get(apiUrl('auth/csrf'), () => HttpResponse.json({ token: 'test-csrf-token' })),
  // No realtime server in unit tests: negotiation fails and the app falls back to polling.
  http.post('http://localhost:3000/hubs/notifications/negotiate', () =>
    HttpResponse.json({ title: 'Unavailable' }, { status: 503 }),
  ),
]

export const server = setupServer(...defaultHandlers)

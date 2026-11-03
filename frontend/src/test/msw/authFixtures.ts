import { http, HttpResponse } from 'msw'

import type { CurrentUser } from '@/features/auth/types'
import { apiUrl } from '@/test/msw/server'

export const TEST_CSRF_TOKEN = 'test-csrf-token'

export const customerFixture: CurrentUser = {
  id: 'u1',
  email: 'ana@nexora.test',
  fullName: 'Ana Pérez',
  roles: ['Customer'],
}

export const adminFixture: CurrentUser = {
  id: 'u2',
  email: 'admin@nexora.test',
  fullName: 'Admin Nexora',
  roles: ['Admin'],
}

const problem = (status: number, body: Record<string, unknown>) =>
  HttpResponse.json(
    { status, ...body },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )

export const anonymousHandler = () =>
  http.get(apiUrl('auth/me'), () => problem(401, { title: 'Unauthorized' }))

/** Makes the API answer GET /auth/me with this user. */
export const signedInAs = (user: CurrentUser) =>
  http.get(apiUrl('auth/me'), () => HttpResponse.json(user))

export const csrfHandler = () =>
  http.get(apiUrl('auth/csrf'), () => HttpResponse.json({ token: TEST_CSRF_TOKEN }))

export { problem }

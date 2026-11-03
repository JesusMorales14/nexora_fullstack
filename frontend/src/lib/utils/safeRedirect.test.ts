import { describe, expect, it } from 'vitest'

import { getSafeRedirectPath } from '@/lib/utils/safeRedirect'

describe('getSafeRedirectPath', () => {
  it.each(['/account', '/products?brand=sony', '/checkout#paso-2'])(
    'keeps the local path %s',
    (path) => {
      expect(getSafeRedirectPath(path)).toBe(path)
    },
  )

  it.each([
    null,
    undefined,
    '',
    'account',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
  ])('rejects %s', (value) => {
    expect(getSafeRedirectPath(value, '/account')).toBe('/account')
  })
})

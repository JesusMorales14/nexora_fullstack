import { describe, expect, it } from 'vitest'

import { variantSchema } from '@/features/products/admin/schemas'

const validVariant = {
  sku: 'TAB-001',
  name: '64 GB',
  price: 19.99,
  compareAtPrice: '',
  initialStock: 5,
  lowStockThreshold: 2,
}

describe('variantSchema', () => {
  it('accepts prices with up to two decimals (no floating point false negatives)', () => {
    expect(variantSchema.safeParse(validVariant).success).toBe(true)
    expect(variantSchema.safeParse({ ...validVariant, price: 0.1 + 0.2 }).success).toBe(false)
    expect(variantSchema.safeParse({ ...validVariant, price: 10.555 }).success).toBe(false)
  })

  it('requires the previous price to be higher than the price', () => {
    const result = variantSchema.safeParse({ ...validVariant, compareAtPrice: '10' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['compareAtPrice'])
  })
})

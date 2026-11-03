import { describe, expect, it } from 'vitest'

import { formatPrice } from '@/lib/utils/formatPrice'

// Intl may use a non-breaking space between symbol and amount; normalize it for readable asserts.
const normalizeSpaces = (value: string) => value.replace(/\s/g, ' ')

describe('formatPrice', () => {
  it('formats soles with the S/ symbol and two decimals', () => {
    expect(normalizeSpaces(formatPrice(1299))).toBe('S/ 1,299.00')
  })

  it('keeps céntimos', () => {
    expect(normalizeSpaces(formatPrice(159.9))).toBe('S/ 159.90')
  })
})

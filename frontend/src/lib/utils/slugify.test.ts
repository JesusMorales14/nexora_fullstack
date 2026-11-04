import { describe, expect, it } from 'vitest'

import { slugify } from '@/lib/utils/slugify'

describe('slugify', () => {
  it.each([
    ['Teclado Mecánico RGB 60%', 'teclado-mecanico-rgb-60'],
    ['  Audífonos   Inalámbricos  ', 'audifonos-inalambricos'],
    ['Señal 5G — Edición Perú', 'senal-5g-edicion-peru'],
    ['---', ''],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it('never ends with a hyphen after truncation', () => {
    expect(slugify(`${'a'.repeat(119)} b`)).toBe('a'.repeat(119))
  })
})

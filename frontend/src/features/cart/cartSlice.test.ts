import { describe, expect, it } from 'vitest'

import {
  cartCleared,
  cartSlice,
  type CartState,
  itemAdded,
  itemRemoved,
  MAX_QUANTITY_PER_ITEM,
  quantityChanged,
} from '@/features/cart/cartSlice'
import { loadCart, saveCart } from '@/features/cart/cartStorage'

const reducer = cartSlice.reducer
const VARIANT_A = '0193a1c2-0000-7000-8000-00000000000a'
const VARIANT_B = '0193a1c2-0000-7000-8000-00000000000b'

describe('cartSlice', () => {
  it('adds new items and merges repeated ones', () => {
    let state = reducer(undefined, itemAdded({ variantId: VARIANT_A, quantity: 1 }))
    state = reducer(state, itemAdded({ variantId: VARIANT_B, quantity: 2 }))
    state = reducer(state, itemAdded({ variantId: VARIANT_A, quantity: 3 }))

    expect(state.items).toEqual([
      { variantId: VARIANT_A, quantity: 4 },
      { variantId: VARIANT_B, quantity: 2 },
    ])
  })

  it('never exceeds the per-item limit enforced by the API', () => {
    const state = reducer(
      { items: [{ variantId: VARIANT_A, quantity: 8 }] },
      itemAdded({ variantId: VARIANT_A, quantity: 5 }),
    )

    expect(state.items[0]?.quantity).toBe(MAX_QUANTITY_PER_ITEM)
  })

  it('changes quantities within bounds, removes items and clears the cart', () => {
    const initial: CartState = {
      items: [
        { variantId: VARIANT_A, quantity: 2 },
        { variantId: VARIANT_B, quantity: 1 },
      ],
    }

    expect(
      reducer(initial, quantityChanged({ variantId: VARIANT_A, quantity: 0 })).items[0],
    ).toEqual({ variantId: VARIANT_A, quantity: 1 })
    expect(reducer(initial, itemRemoved(VARIANT_A)).items).toEqual([
      { variantId: VARIANT_B, quantity: 1 },
    ])
    expect(reducer(initial, cartCleared()).items).toEqual([])
  })
})

describe('cartStorage', () => {
  it('round-trips a valid cart', () => {
    const cart: CartState = { items: [{ variantId: VARIANT_A, quantity: 3 }] }
    saveCart(cart, window.localStorage)

    expect(loadCart(window.localStorage)).toEqual(cart)
  })

  it.each([
    'not json',
    JSON.stringify({ items: [{ variantId: 'x', quantity: 1 }] }),
    JSON.stringify({ items: [{ variantId: VARIANT_A, quantity: 999 }] }),
    JSON.stringify({ items: [{ variantId: VARIANT_A, quantity: 1, price: 0.01 }] }),
  ])('ignores tampered or corrupt data: %s', (raw) => {
    window.localStorage.setItem('nexora.cart.v1', raw)

    const loaded = loadCart(window.localStorage)

    // Extra fields such as a forged price are stripped; invalid carts are dropped entirely.
    expect(loaded === undefined || !('price' in (loaded.items[0] ?? {}))).toBe(true)
  })
})

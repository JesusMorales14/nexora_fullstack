import { z } from 'zod'

import { type CartState, MAX_CART_LINES, MAX_QUANTITY_PER_ITEM } from '@/features/cart/cartSlice'

const STORAGE_KEY = 'nexora.cart.v1'

// localStorage is user-controlled input: validate it like any other external data.
const storedCartSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .max(MAX_CART_LINES),
})

export function loadCart(storage?: Storage): CartState | undefined {
  try {
    // Even reading `localStorage` throws when storage is blocked, so it stays inside the try.
    const raw = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY)
    if (!raw) return undefined
    const parsed = storedCartSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : undefined
  } catch {
    // Blocked storage (private mode, disabled site data) or corrupt JSON: start with an empty cart.
    return undefined
  }
}

export function saveCart(cart: CartState, storage?: Storage) {
  try {
    ;(storage ?? globalThis.localStorage).setItem(
      STORAGE_KEY,
      JSON.stringify({ items: cart.items }),
    )
  } catch {
    // Quota exceeded or storage blocked: the cart still works for this visit.
  }
}

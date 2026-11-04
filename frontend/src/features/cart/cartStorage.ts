import {
  type CartItem,
  type CartState,
  MAX_CART_LINES,
  MAX_QUANTITY_PER_ITEM,
} from '@/features/cart/cartSlice'

const STORAGE_KEY = 'nexora.cart.v1'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// localStorage is user-controlled input, so it is validated like any other external data. This runs
// on every page load, so it is a tiny hand-written check instead of pulling Zod into the first bundle.

function toCartItem(value: unknown): CartItem | null {
  if (typeof value !== 'object' || value === null) return null
  const { variantId, quantity } = value as Record<string, unknown>
  if (typeof variantId !== 'string' || !UUID_PATTERN.test(variantId)) return null
  if (typeof quantity !== 'number' || !Number.isInteger(quantity)) return null
  if (quantity < 1 || quantity > MAX_QUANTITY_PER_ITEM) return null
  // Only known fields are kept: anything else (e.g. a forged price) is dropped.
  return { variantId, quantity }
}

export function parseStoredCart(raw: string): CartState | undefined {
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || !('items' in parsed)) return undefined
  const { items } = parsed
  if (!Array.isArray(items) || items.length > MAX_CART_LINES) return undefined

  const cartItems = items.map(toCartItem)
  return cartItems.every((item) => item !== null) ? { items: cartItems } : undefined
}

export function loadCart(storage?: Storage): CartState | undefined {
  try {
    // Even reading `localStorage` throws when storage is blocked, so it stays inside the try.
    const raw = (storage ?? globalThis.localStorage).getItem(STORAGE_KEY)
    return raw ? parseStoredCart(raw) : undefined
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

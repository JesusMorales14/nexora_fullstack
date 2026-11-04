import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Mirrors OrderItem.MaxQuantity in the API (which enforces it). */
export const MAX_QUANTITY_PER_ITEM = 10
/** Mirrors the API's maximum number of distinct cart lines. */
export const MAX_CART_LINES = 20

/**
 * Only identifiers and quantities live in the browser. Prices, names and stock always come from
 * the API's cart quote, so a stale or tampered cart can never change what the customer pays.
 */
export interface CartItem {
  variantId: string
  quantity: number
}

export interface CartState {
  items: CartItem[]
}

const initialState: CartState = { items: [] }

function clampQuantity(quantity: number) {
  return Math.min(Math.max(Math.trunc(quantity), 1), MAX_QUANTITY_PER_ITEM)
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    itemAdded(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((item) => item.variantId === action.payload.variantId)
      if (existing) {
        existing.quantity = clampQuantity(existing.quantity + action.payload.quantity)
      } else if (state.items.length < MAX_CART_LINES) {
        state.items.push({
          variantId: action.payload.variantId,
          quantity: clampQuantity(action.payload.quantity),
        })
      }
    },
    quantityChanged(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find((item) => item.variantId === action.payload.variantId)
      if (existing) existing.quantity = clampQuantity(action.payload.quantity)
    },
    itemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.variantId !== action.payload)
    },
    itemsRemoved(state, action: PayloadAction<string[]>) {
      const toRemove = new Set(action.payload)
      state.items = state.items.filter((item) => !toRemove.has(item.variantId))
    },
    cartCleared(state) {
      state.items = []
    },
  },
  selectors: {
    selectCartItems: (state) => state.items,
    // Derived on read instead of being stored: one source of truth.
    selectCartCount: (state) => state.items.reduce((total, item) => total + item.quantity, 0),
  },
})

export const { itemAdded, quantityChanged, itemRemoved, itemsRemoved, cartCleared } =
  cartSlice.actions
export const { selectCartItems, selectCartCount } = cartSlice.selectors

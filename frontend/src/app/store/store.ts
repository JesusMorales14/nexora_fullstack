import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { cartSlice } from '@/features/cart/cartSlice'
import { loadCart, saveCart } from '@/features/cart/cartStorage'
import { baseApi } from '@/lib/api/baseApi'

const rootReducer = combineSlices(baseApi, cartSlice)

export type RootState = ReturnType<typeof rootReducer>

/** Factory so tests can create an isolated store per test case. */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

const persistedCart = loadCart()
export const store = makeStore(persistedCart ? { cart: persistedCart } : undefined)

// Persist only the cart (ids + quantities). Server data stays in RTK Query's memory cache.
let lastSavedCart = store.getState().cart
store.subscribe(() => {
  const { cart } = store.getState()
  if (cart !== lastSavedCart) {
    lastSavedCart = cart
    saveCart(cart)
  }
})

// Enables refetchOnFocus / refetchOnReconnect behaviour for RTK Query.
setupListeners(store.dispatch)

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']

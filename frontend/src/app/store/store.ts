import { combineSlices, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'

import { baseApi } from '@/lib/api/baseApi'

const rootReducer = combineSlices(baseApi)

export type RootState = ReturnType<typeof rootReducer>

/** Factory so tests can create an isolated store per test case. */
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

export const store = makeStore()

// Enables refetchOnFocus / refetchOnReconnect behaviour for RTK Query.
setupListeners(store.dispatch)

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']

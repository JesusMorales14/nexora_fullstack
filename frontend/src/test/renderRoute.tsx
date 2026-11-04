import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'

import { routes } from '@/app/router/routes'
import { makeStore } from '@/app/store/store'
import type { CartItem } from '@/features/cart/cartSlice'

interface RenderRouteOptions {
  cart?: CartItem[]
}

/** Renders the real route table at `path` with a fresh, isolated Redux store. */
export function renderRoute(path: string, { cart = [] }: RenderRouteOptions = {}) {
  const store = makeStore({ cart: { items: cart } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  return {
    store,
    router,
    ...render(
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>,
    ),
  }
}

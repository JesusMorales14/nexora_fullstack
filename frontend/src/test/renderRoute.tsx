import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/app/router/routes'
import { makeStore } from '@/app/store/store'

/** Renders the real route table at `path` with a fresh, isolated Redux store. */
export function renderRoute(path: string) {
  const store = makeStore()
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

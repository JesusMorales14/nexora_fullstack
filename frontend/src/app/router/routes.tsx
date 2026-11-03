import type { RouteObject } from 'react-router'

import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageLoader } from '@/components/shared/PageLoader'
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary'
import { HomePage } from '@/features/home/pages/HomePage'
import { StorefrontLayout } from '@/layouts/StorefrontLayout'

/**
 * Route table shared by the browser router and the tests (createMemoryRouter).
 * Home and the storefront shell are eager because they are the most common entry point;
 * every other page is code-split with `lazy` so the first load stays small.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    Component: StorefrontLayout,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'products',
        lazy: async () => {
          const { CatalogPage } = await import('@/features/products/pages/CatalogPage')
          return { Component: CatalogPage }
        },
      },
      {
        path: 'products/:slug',
        lazy: async () => {
          const { ProductDetailsPage } =
            await import('@/features/products/pages/ProductDetailsPage')
          return { Component: ProductDetailsPage }
        },
      },
      {
        path: 'cart',
        lazy: async () => {
          const { CartPage } = await import('@/features/cart/pages/CartPage')
          return { Component: CartPage }
        },
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    // The whole admin area is a separate chunk: storefront visitors never download it.
    path: '/admin',
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    lazy: async () => {
      const { AdminLayout } = await import('@/layouts/AdminLayout')
      return { Component: AdminLayout }
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const { AdminDashboardPage } =
            await import('@/features/analytics/pages/AdminDashboardPage')
          return { Component: AdminDashboardPage }
        },
      },
    ],
  },
]

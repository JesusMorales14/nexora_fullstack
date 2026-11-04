import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'

import { GuestOnly, RequireAdmin, RequireAuth } from '@/app/router/guards'
import { NotFoundPage } from '@/components/shared/NotFoundPage'
import { PageLoader } from '@/components/shared/PageLoader'
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary'
import { HomePage } from '@/features/home/pages/HomePage'
import { AppShell } from '@/layouts/AppShell'
import { StorefrontLayout } from '@/layouts/StorefrontLayout'

/** Code-splits a page while keeping named exports (no default exports needed). */
function lazyPage<TModule>(load: () => Promise<TModule>, pick: (module: TModule) => ComponentType) {
  return async () => ({ Component: pick(await load()) })
}

/**
 * Route table shared by the browser router and the tests (createMemoryRouter).
 * Home and the storefront shell are eager because they are the most common entry point;
 * every other page is code-split so the first load stays small.
 */
const appRoutes: RouteObject[] = [
  {
    path: '/',
    Component: StorefrontLayout,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    children: [
      { index: true, Component: HomePage },
      {
        path: 'products',
        lazy: lazyPage(
          () => import('@/features/products/pages/CatalogPage'),
          (m) => m.CatalogPage,
        ),
      },
      {
        path: 'products/:slug',
        lazy: lazyPage(
          () => import('@/features/products/pages/ProductDetailsPage'),
          (m) => m.ProductDetailsPage,
        ),
      },
      {
        path: 'cart',
        lazy: lazyPage(
          () => import('@/features/cart/pages/CartPage'),
          (m) => m.CartPage,
        ),
      },
      {
        Component: GuestOnly,
        children: [
          {
            path: 'login',
            lazy: lazyPage(
              () => import('@/features/auth/pages/LoginPage'),
              (m) => m.LoginPage,
            ),
          },
          {
            path: 'register',
            lazy: lazyPage(
              () => import('@/features/auth/pages/RegisterPage'),
              (m) => m.RegisterPage,
            ),
          },
          {
            path: 'forgot-password',
            lazy: lazyPage(
              () => import('@/features/auth/pages/ForgotPasswordPage'),
              (m) => m.ForgotPasswordPage,
            ),
          },
        ],
      },
      {
        path: 'reset-password',
        lazy: lazyPage(
          () => import('@/features/auth/pages/ResetPasswordPage'),
          (m) => m.ResetPasswordPage,
        ),
      },
      {
        Component: RequireAuth,
        children: [
          {
            path: 'account',
            lazy: lazyPage(
              () => import('@/features/auth/pages/AccountPage'),
              (m) => m.AccountPage,
            ),
          },
          {
            path: 'account/orders',
            lazy: lazyPage(
              () => import('@/features/orders/pages/OrdersPage'),
              (m) => m.OrdersPage,
            ),
          },
          {
            path: 'account/orders/:orderNumber',
            lazy: lazyPage(
              () => import('@/features/orders/pages/OrderPage'),
              (m) => m.OrderPage,
            ),
          },
          {
            path: 'checkout',
            lazy: lazyPage(
              () => import('@/features/checkout/pages/CheckoutPage'),
              (m) => m.CheckoutPage,
            ),
          },
          {
            path: 'checkout/pay/:orderNumber',
            lazy: lazyPage(
              () => import('@/features/checkout/pages/SimulatedPaymentPage'),
              (m) => m.SimulatedPaymentPage,
            ),
          },
          {
            path: 'orders/:orderNumber/confirmation',
            lazy: lazyPage(
              () => import('@/features/orders/pages/OrderPage'),
              (m) => m.OrderConfirmationPage,
            ),
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
  {
    // The whole admin area is a separate chunk: storefront visitors never download it.
    path: '/admin',
    Component: RequireAdmin,
    ErrorBoundary: RouteErrorBoundary,
    HydrateFallback: PageLoader,
    children: [
      {
        lazy: lazyPage(
          () => import('@/layouts/AdminLayout'),
          (m) => m.AdminLayout,
        ),
        children: [
          {
            index: true,
            lazy: lazyPage(
              () => import('@/features/analytics/pages/AdminDashboardPage'),
              (m) => m.AdminDashboardPage,
            ),
          },
          {
            path: 'products',
            lazy: lazyPage(
              () => import('@/features/products/admin/pages/AdminProductsPage'),
              (m) => m.AdminProductsPage,
            ),
          },
          {
            path: 'products/new',
            lazy: lazyPage(
              () => import('@/features/products/admin/pages/AdminProductEditorPage'),
              (m) => m.AdminProductEditorPage,
            ),
          },
          {
            path: 'products/:productId',
            lazy: lazyPage(
              () => import('@/features/products/admin/pages/AdminProductEditorPage'),
              (m) => m.AdminProductEditorPage,
            ),
          },
          {
            path: 'categories',
            lazy: lazyPage(
              () => import('@/features/categories/pages/AdminCategoriesPage'),
              (m) => m.AdminCategoriesPage,
            ),
          },
          {
            path: 'inventory',
            lazy: lazyPage(
              () => import('@/features/inventory/pages/AdminInventoryPage'),
              (m) => m.AdminInventoryPage,
            ),
          },
          {
            path: 'orders',
            lazy: lazyPage(
              () => import('@/features/orders/admin/pages/AdminOrdersPage'),
              (m) => m.AdminOrdersPage,
            ),
          },
          {
            path: 'orders/:orderNumber',
            lazy: lazyPage(
              () => import('@/features/orders/admin/pages/AdminOrderPage'),
              (m) => m.AdminOrderPage,
            ),
          },
          {
            path: 'customers',
            lazy: lazyPage(
              () => import('@/features/customers/pages/AdminCustomersPage'),
              (m) => m.AdminCustomersPage,
            ),
          },
          {
            path: 'administrators',
            lazy: lazyPage(
              () => import('@/features/customers/pages/AdministratorsPage'),
              (m) => m.AdministratorsPage,
            ),
          },
          {
            path: 'reports',
            lazy: lazyPage(
              () => import('@/features/analytics/pages/ReportsPage'),
              (m) => m.ReportsPage,
            ),
          },
          {
            path: 'audit-log',
            lazy: lazyPage(
              () => import('@/features/audit/pages/AuditLogPage'),
              (m) => m.AuditLogPage,
            ),
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]

/** Pathless root: AppShell hosts the realtime connection and notifications for every page. */
export const routes: RouteObject[] = [{ Component: AppShell, children: appRoutes }]

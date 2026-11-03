import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { adminFixture, customerFixture, signedInAs } from '@/test/msw/authFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

describe('route guards', () => {
  it('sends anonymous visitors to login and remembers where they were going', async () => {
    const { router } = renderRoute('/account')

    await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })
    expect(router.state.location.pathname).toBe('/login')
    expect(router.state.location.search).toBe('?returnTo=%2Faccount')
  })

  it('shows the account of a signed-in customer and logs out', async () => {
    server.use(signedInAs(customerFixture))
    server.use(
      http.post(apiUrl('auth/logout'), () => {
        server.resetHandlers()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const user = userEvent.setup()
    const { router } = renderRoute('/account')

    expect(await screen.findByText(customerFixture.email)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Panel de administración/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await screen.findByRole('heading', { level: 1, name: 'Tecnología que te impulsa' })
    expect(router.state.location.pathname).toBe('/')
    expect(await screen.findByRole('link', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('blocks customers from the admin area', async () => {
    server.use(signedInAs(customerFixture))

    renderRoute('/admin')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'No tienes acceso a esta sección' }),
    ).toBeInTheDocument()
  })

  it('lets admins into the dashboard', async () => {
    server.use(
      signedInAs(adminFixture),
      http.get(apiUrl('admin/summary'), () =>
        HttpResponse.json({
          totalProducts: 16,
          publishedProducts: 15,
          lowStockVariants: 4,
          outOfStockVariants: 2,
          customers: 3,
        }),
      ),
    )

    renderRoute('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(await screen.findByText('15 publicados')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Administración' })).toBeInTheDocument()
  })

  it('redirects signed-in users away from the login page', async () => {
    server.use(signedInAs(customerFixture))

    const { router } = renderRoute('/login')

    await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })
    expect(router.state.location.pathname).toBe('/account')
  })
})

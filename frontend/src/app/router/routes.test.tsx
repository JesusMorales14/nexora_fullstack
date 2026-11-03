import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderRoute } from '@/test/renderRoute'

describe('routes', () => {
  it('renders the home page inside the storefront layout', async () => {
    renderRoute('/')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tecnología que te impulsa' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).toBeInTheDocument()
  })

  it('lazy-loads the catalog page', async () => {
    renderRoute('/products')

    expect(await screen.findByRole('heading', { level: 1, name: 'Catálogo' })).toBeInTheDocument()
  })

  it('shows the 404 page for unknown URLs', async () => {
    renderRoute('/this-page-does-not-exist')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('renders the admin area with its own layout', async () => {
    renderRoute('/admin')

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Administración' })).toBeInTheDocument()
  })
})

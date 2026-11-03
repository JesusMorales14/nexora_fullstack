import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderRoute } from '@/test/renderRoute'

describe('ProductDetailsPage', () => {
  it('shows the product and updates price and stock when another variant is chosen', async () => {
    const user = userEvent.setup()
    renderRoute('/products/samsung-galaxy-s25')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Samsung Galaxy S25' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Samsung Galaxy S25' })).toHaveAttribute('width', '800')
    expect(screen.getByText('SKU: SAM-S25-12-256')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /512 GB/ }))

    expect(screen.getByText('SKU: SAM-S25-12-512')).toBeInTheDocument()
    expect(screen.getByText('Últimas unidades')).toBeInTheDocument()
  })

  it('shows the 404 page for unknown products', async () => {
    renderRoute('/products/does-not-exist')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })
})

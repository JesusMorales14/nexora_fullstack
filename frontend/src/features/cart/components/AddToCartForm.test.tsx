import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { renderRoute } from '@/test/renderRoute'

describe('add to cart from the product page', () => {
  it('adds the selected variant and quantity and updates the header badge', async () => {
    const user = userEvent.setup()
    const { store } = renderRoute('/products/samsung-galaxy-s25')

    await user.click(await screen.findByRole('radio', { name: /512 GB/ }))
    await user.selectOptions(screen.getByLabelText('Cantidad'), '2')
    await user.click(screen.getByRole('button', { name: 'Añadir al carrito' }))

    expect(store.getState().cart.items).toEqual([{ variantId: 'v2', quantity: 2 }])
    expect(screen.getByRole('status')).toHaveTextContent(
      'Añadiste 2 × Samsung Galaxy S25 al carrito.',
    )
    expect(
      screen.getByRole('link', { name: 'Carrito de compras, 2 productos' }),
    ).toBeInTheDocument()
  })
})

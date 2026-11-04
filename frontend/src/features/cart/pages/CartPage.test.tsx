import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { quoteFixture, VARIANT_ID } from '@/test/msw/orderFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

describe('CartPage', () => {
  it('shows an empty state without calling the API', async () => {
    renderRoute('/cart')

    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument()
  })

  it('renders server-priced lines and sends only ids and quantities', async () => {
    let requestBody: unknown
    server.use(
      http.post(apiUrl('cart/quote'), async ({ request }) => {
        requestBody = await request.json()
        return HttpResponse.json(quoteFixture())
      }),
    )

    renderRoute('/cart', { cart: [{ variantId: VARIANT_ID, quantity: 2 }] })

    const line = await screen.findByRole('link', { name: 'Logitech MX Master 3S' })
    expect(line).toHaveAttribute('href', '/products/logitech-mx-master-3s')
    expect(requestBody).toEqual({ items: [{ variantId: VARIANT_ID, quantity: 2 }] })
    const summary = screen.getByRole('region', { name: 'Resumen' })
    expect(within(summary).getByText('Se calcula con tu dirección')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continuar con la compra' })).toHaveAttribute(
      'href',
      '/checkout',
    )
  })

  it('updates the stored cart when quantity changes or a line is removed', async () => {
    server.use(http.post(apiUrl('cart/quote'), () => HttpResponse.json(quoteFixture())))
    const user = userEvent.setup()
    const { store } = renderRoute('/cart', { cart: [{ variantId: VARIANT_ID, quantity: 2 }] })

    await user.selectOptions(await screen.findByLabelText('Cantidad'), '5')
    expect(store.getState().cart.items).toEqual([{ variantId: VARIANT_ID, quantity: 5 }])

    await user.click(
      screen.getByRole('button', { name: 'Quitar Logitech MX Master 3S (Grafito) del carrito' }),
    )
    expect(store.getState().cart.items).toEqual([])
    expect(await screen.findByText('Tu carrito está vacío')).toBeInTheDocument()
  })

  it('blocks checkout when there is not enough stock', async () => {
    const base = quoteFixture()
    const [line] = base.lines
    if (!line) throw new Error('fixture needs a line')
    server.use(
      http.post(apiUrl('cart/quote'), () =>
        HttpResponse.json(
          quoteFixture({
            lines: [{ ...line, isAvailable: false, maxQuantity: 1 }],
            canCheckout: false,
          }),
        ),
      ),
    )

    renderRoute('/cart', { cart: [{ variantId: VARIANT_ID, quantity: 2 }] })

    expect(await screen.findByText('Solo queda 1 unidad disponible.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar con la compra' })).toBeDisabled()
  })
})

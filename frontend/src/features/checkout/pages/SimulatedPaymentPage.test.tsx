import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { customerFixture, signedInAs } from '@/test/msw/authFixtures'
import { ORDER_NUMBER, orderFixture, VARIANT_ID } from '@/test/msw/orderFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

const CART = [{ variantId: VARIANT_ID, quantity: 2 }]

describe('SimulatedPaymentPage', () => {
  it('approving the payment clears the cart and shows the confirmation', async () => {
    let currentOrder = orderFixture()
    server.use(
      signedInAs(customerFixture),
      http.get(apiUrl(`orders/${ORDER_NUMBER}`), () => HttpResponse.json(currentOrder)),
      http.post(apiUrl(`orders/${ORDER_NUMBER}/simulated-payment`), () => {
        currentOrder = orderFixture({ status: 'Paid', paidAt: '2026-11-03T15:31:00Z' })
        return HttpResponse.json(currentOrder)
      }),
    )
    const user = userEvent.setup()
    const { store, router } = renderRoute(`/checkout/pay/${ORDER_NUMBER}`, { cart: CART })

    expect(await screen.findByText(/Modo de prueba/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aprobar pago' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '¡Gracias por tu compra!' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/orders/${ORDER_NUMBER}/confirmation`)
    expect(store.getState().cart.items).toEqual([])
    expect(screen.getByText('Pagado')).toBeInTheDocument()
  })

  it('a rejected payment keeps the cart', async () => {
    server.use(
      signedInAs(customerFixture),
      http.get(apiUrl(`orders/${ORDER_NUMBER}`), () => HttpResponse.json(orderFixture())),
      http.post(apiUrl(`orders/${ORDER_NUMBER}/simulated-payment`), () =>
        HttpResponse.json(orderFixture({ status: 'PaymentFailed' })),
      ),
    )
    const user = userEvent.setup()
    const { store } = renderRoute(`/checkout/pay/${ORDER_NUMBER}`, { cart: CART })

    await user.click(await screen.findByRole('button', { name: 'Rechazar pago' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El pago fue rechazado')
    expect(store.getState().cart.items).toEqual(CART)
  })
})

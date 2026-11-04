import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { customerFixture, problem, signedInAs } from '@/test/msw/authFixtures'
import { ORDER_NUMBER, orderFixture, quoteFixture, VARIANT_ID } from '@/test/msw/orderFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

const CART = [{ variantId: VARIANT_ID, quantity: 2 }]

async function fillAddress() {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Celular'), '987654321')
  await user.selectOptions(screen.getByLabelText('Departamento'), 'Arequipa')
  await user.type(screen.getByLabelText('Provincia'), 'Arequipa')
  await user.type(screen.getByLabelText('Distrito'), 'Yanahuara')
  await user.type(screen.getByLabelText('Dirección'), 'Calle Misti 456')
  return user
}

describe('CheckoutPage', () => {
  it('requires a session', async () => {
    const { router } = renderRoute('/checkout', { cart: CART })

    await screen.findByRole('heading', { level: 1, name: 'Iniciar sesión' })
    expect(router.state.location.search).toBe('?returnTo=%2Fcheckout')
  })

  it('validates the address before placing the order', async () => {
    server.use(
      signedInAs(customerFixture),
      http.post(apiUrl('cart/quote'), () => HttpResponse.json(quoteFixture())),
    )
    const user = userEvent.setup()
    renderRoute('/checkout', { cart: CART })

    expect(await screen.findByLabelText('Nombre de quien recibe')).toHaveValue('Ana Pérez')
    await user.click(await screen.findByRole('button', { name: 'Ir a pagar' }))

    expect(
      await screen.findByText('Ingresa un celular de 9 dígitos que empiece con 9.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Selecciona un departamento.')).toBeInTheDocument()
  })

  it('places the order with an idempotency key and goes to payment', async () => {
    let idempotencyKey: string | null = null
    let body: unknown
    server.use(
      signedInAs(customerFixture),
      http.post(apiUrl('cart/quote'), () => HttpResponse.json(quoteFixture())),
      http.post(apiUrl('checkout'), async ({ request }) => {
        idempotencyKey = request.headers.get('Idempotency-Key')
        body = await request.json()
        return HttpResponse.json(
          { order: orderFixture(), paymentUrl: `/checkout/pay/${ORDER_NUMBER}` },
          { status: 201 },
        )
      }),
      http.get(apiUrl(`orders/${ORDER_NUMBER}`), () => HttpResponse.json(orderFixture())),
    )
    renderRoute('/checkout', { cart: CART })

    const user = await fillAddress()
    await user.click(await screen.findByRole('button', { name: 'Ir a pagar' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: `Pagar pedido ${ORDER_NUMBER}` }),
    ).toBeInTheDocument()
    expect(idempotencyKey).toMatch(/^[0-9a-f-]{36}$/)
    expect(body).toMatchObject({
      items: CART,
      shippingAddress: { department: 'Arequipa', phone: '987654321' },
    })
  })

  it('explains stock conflicts and links back to the cart', async () => {
    server.use(
      signedInAs(customerFixture),
      http.post(apiUrl('cart/quote'), () => HttpResponse.json(quoteFixture())),
      http.post(apiUrl('checkout'), () =>
        problem(409, {
          title: 'Insufficient stock',
          detail: 'No hay stock suficiente para algunos productos.',
        }),
      ),
    )
    renderRoute('/checkout', { cart: CART })

    const user = await fillAddress()
    await user.click(await screen.findByRole('button', { name: 'Ir a pagar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay stock suficiente para algunos productos.',
    )
    expect(screen.getByRole('link', { name: 'Revisar carrito' })).toHaveAttribute('href', '/cart')
  })
})

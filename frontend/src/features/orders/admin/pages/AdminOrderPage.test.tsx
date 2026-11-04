import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { AdminOrderDetails } from '@/features/orders/admin/adminOrdersApi'
import { adminFixture, signedInAs } from '@/test/msw/authFixtures'
import { ORDER_NUMBER, orderFixture } from '@/test/msw/orderFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

function adminOrder(overrides: Partial<AdminOrderDetails> = {}): AdminOrderDetails {
  return {
    order: orderFixture({ status: 'Paid' }),
    customerEmail: 'ana@nexora.test',
    customerName: 'Ana Pérez',
    shippedAt: null,
    allowedTransitions: ['Shipped'],
    ...overrides,
  }
}

describe('AdminOrderPage', () => {
  it('ships a paid order after confirmation and shows the new state', async () => {
    let current = adminOrder()
    let requested: unknown
    server.use(
      signedInAs(adminFixture),
      http.get(apiUrl(`admin/orders/${ORDER_NUMBER}`), () => HttpResponse.json(current)),
      http.post(apiUrl(`admin/orders/${ORDER_NUMBER}/status`), async ({ request }) => {
        requested = await request.json()
        current = adminOrder({
          order: orderFixture({ status: 'Shipped' }),
          shippedAt: '2026-11-04T10:00:00Z',
          allowedTransitions: ['Delivered'],
        })
        return HttpResponse.json(current)
      }),
    )
    const user = userEvent.setup()
    renderRoute(`/admin/orders/${ORDER_NUMBER}`)

    expect(await screen.findByText('ana@nexora.test')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Marcar como enviado' }))
    // Nothing changes until the admin confirms in the dialog.
    expect(requested).toBeUndefined()
    await user.click(await screen.findByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByRole('button', { name: 'Marcar como entregado' })).toBeInTheDocument()
    expect(requested).toEqual({ status: 'Shipped' })
    expect(screen.getByText('Enviado', { selector: 'span' })).toBeInTheDocument()
  })
})

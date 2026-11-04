import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { ADMIN_VARIANT_ID, PRODUCT_ID } from '@/test/msw/adminFixtures'
import { adminFixture, signedInAs } from '@/test/msw/authFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

const item = {
  variantId: ADMIN_VARIANT_ID,
  productId: PRODUCT_ID,
  productName: 'Laptop Pro 14',
  variantName: '16 GB',
  sku: 'LAP-PRO-14',
  onHand: 3,
  reserved: 1,
  available: 2,
  lowStockThreshold: 5,
  isLowStock: true,
}

describe('AdminInventoryPage', () => {
  it('flags low stock and records an adjustment with its reason', async () => {
    let body: unknown
    server.use(
      signedInAs(adminFixture),
      http.get(apiUrl('admin/inventory'), () =>
        HttpResponse.json({ items: [item], page: 1, pageSize: 20, totalCount: 1, totalPages: 1 }),
      ),
      http.post(apiUrl(`admin/inventory/${ADMIN_VARIANT_ID}/adjustments`), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ ...item, onHand: 13, available: 12, isLowStock: false })
      }),
    )
    const user = userEvent.setup()
    renderRoute('/admin/inventory')

    expect(await screen.findByText('Stock bajo')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Ajustar stock de LAP-PRO-14' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Cantidad (+ entra, − sale)'), '-1')
    await user.selectOptions(within(dialog).getByLabelText('Motivo'), 'Damage')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar ajuste' }))

    // Damage requires an explanation before anything is sent.
    expect(
      await within(dialog).findByText('Explica el motivo de la corrección.'),
    ).toBeInTheDocument()
    expect(body).toBeUndefined()

    await user.type(within(dialog).getByLabelText('Nota'), 'Pantalla rota en almacén')
    await user.click(within(dialog).getByRole('button', { name: 'Registrar ajuste' }))

    await screen.findByRole('button', { name: 'Ajustar stock de LAP-PRO-14' })
    expect(body).toEqual({ quantityChange: -1, reason: 'Damage', note: 'Pantalla rota en almacén' })
  })
})

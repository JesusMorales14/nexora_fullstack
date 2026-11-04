import { describe, expect, it } from 'vitest'

import { notificationAdded, notificationsSlice } from '@/features/notifications/notificationsSlice'
import { reactToRealtimeEvent } from '@/features/notifications/realtimeEvents'

const now = '2026-11-04T15:00:00Z'

describe('reactToRealtimeEvent', () => {
  it('turns a paid order into admin cache refreshes and a notification', () => {
    const reaction = reactToRealtimeEvent(
      'OrderPaid',
      { orderNumber: 'NX-ABC12345', total: 898, occurredAt: now },
      { isAdmin: true },
    )

    expect(reaction?.tags).toContainEqual({ type: 'AdminOrder', id: 'LIST' })
    expect(reaction?.tags).toContain('AdminSummary')
    expect(reaction?.notification?.message.replace(/\s/g, ' ')).toBe(
      'Nuevo pedido pagado NX-ABC12345 por S/ 898.00',
    )
    expect(reaction?.notification?.link).toBe('/admin/orders/NX-ABC12345')
  })

  it('tells customers when their order ships, but not about steps they took themselves', () => {
    const shipped = reactToRealtimeEvent(
      'OrderStatusChanged',
      { orderNumber: 'NX-ABC12345', status: 'Shipped', occurredAt: now },
      { isAdmin: false },
    )
    const paid = reactToRealtimeEvent(
      'OrderStatusChanged',
      { orderNumber: 'NX-ABC12345', status: 'Paid', occurredAt: now },
      { isAdmin: false },
    )

    expect(shipped?.notification?.message).toBe('Tu pedido NX-ABC12345 ahora está: Enviado')
    expect(shipped?.tags).toContainEqual({ type: 'Order', id: 'NX-ABC12345' })
    expect(paid?.notification).toBeUndefined()
    // The data is still refreshed even without a notification.
    expect(paid?.tags).toContainEqual({ type: 'Order', id: 'NX-ABC12345' })
  })

  it('does not notify admins about status changes (they made them)', () => {
    const reaction = reactToRealtimeEvent(
      'OrderStatusChanged',
      { orderNumber: 'NX-ABC12345', status: 'Delivered', occurredAt: now },
      { isAdmin: true },
    )

    expect(reaction?.notification).toBeUndefined()
  })

  it('describes out-of-stock and low-stock variants differently', () => {
    const base = { variantId: 'v1', sku: 'SKU-1', productName: 'Mouse', occurredAt: now }

    expect(
      reactToRealtimeEvent('StockLow', { ...base, available: 0 }, { isAdmin: true })?.notification
        ?.message,
    ).toBe('Agotado: Mouse (SKU-1)')
    expect(
      reactToRealtimeEvent('StockLow', { ...base, available: 2 }, { isAdmin: true })?.notification
        ?.message,
    ).toBe('Stock bajo: Mouse (SKU-1), quedan 2')
  })

  it.each([
    null,
    'NX-1',
    { orderNumber: 'NX-1' },
    { orderNumber: 'NX-1', status: 'Hacked', occurredAt: now },
  ])('ignores malformed payloads: %j', (payload) => {
    expect(reactToRealtimeEvent('OrderStatusChanged', payload, { isAdmin: false })).toBeNull()
  })
})

describe('notificationsSlice', () => {
  it('keeps only the most recent notifications on screen', () => {
    let state = notificationsSlice.reducer(undefined, { type: 'init' })
    for (let index = 1; index <= 6; index++) {
      state = notificationsSlice.reducer(
        state,
        notificationAdded({ message: `Aviso ${String(index)}` }),
      )
    }

    expect(state.items.map((item) => item.message)).toEqual([
      'Aviso 3',
      'Aviso 4',
      'Aviso 5',
      'Aviso 6',
    ])
    expect(new Set(state.items.map((item) => item.id)).size).toBe(4)
  })
})

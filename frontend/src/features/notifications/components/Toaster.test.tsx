import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { notificationAdded } from '@/features/notifications/notificationsSlice'
import { adminFixture, signedInAs } from '@/test/msw/authFixtures'
import { server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

describe('Toaster', () => {
  it('announces notifications in a live region and lets the user dismiss them', async () => {
    server.use(signedInAs(adminFixture))
    const user = userEvent.setup()
    const { store } = renderRoute('/admin')
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })

    act(() => {
      store.dispatch(
        notificationAdded({ message: 'Nuevo pedido pagado NX-1', link: '/admin/orders/NX-1' }),
      )
    })

    const region = screen.getByRole('region', { name: 'Notificaciones' })
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(within(region).getByText('Nuevo pedido pagado NX-1')).toBeInTheDocument()
    expect(within(region).getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/admin/orders/NX-1',
    )

    await user.click(within(region).getByRole('button', { name: 'Cerrar notificación' }))
    expect(within(region).queryByText('Nuevo pedido pagado NX-1')).not.toBeInTheDocument()
  })

  it('shows that the admin panel falls back to polling when the live connection fails', async () => {
    server.use(signedInAs(adminFixture))

    renderRoute('/admin')

    // The test server rejects the SignalR negotiation (see msw/server.ts).
    expect(
      await screen.findByText('Sin conexión en vivo · actualiza cada 30 s'),
    ).toBeInTheDocument()
  })
})

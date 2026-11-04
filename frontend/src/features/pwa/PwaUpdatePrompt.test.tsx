import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PwaUpdatePrompt } from '@/features/pwa/PwaUpdatePrompt'

const pwa = vi.hoisted(() => ({
  needRefresh: false,
  setNeedRefresh: vi.fn(),
  updateServiceWorker: vi.fn(() => Promise.resolve()),
}))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.needRefresh, pwa.setNeedRefresh],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: pwa.updateServiceWorker,
  }),
}))

describe('PwaUpdatePrompt', () => {
  it('renders nothing while the running version is current', () => {
    pwa.needRefresh = false
    const { container } = render(<PwaUpdatePrompt />)

    expect(container).toBeEmptyDOMElement()
  })

  it('updates only when the user asks for it', async () => {
    pwa.needRefresh = true
    const user = userEvent.setup()
    render(<PwaUpdatePrompt />)

    expect(
      screen.getByRole('alertdialog', { name: 'Nueva versión disponible' }),
    ).toBeInTheDocument()
    expect(pwa.updateServiceWorker).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Más tarde' }))
    expect(pwa.setNeedRefresh).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(pwa.updateServiceWorker).toHaveBeenCalledWith(true)
  })
})

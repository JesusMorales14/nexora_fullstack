import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { OfflineBanner } from '@/features/pwa/OfflineBanner'

function setOnline(isOnline: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline)
  window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'))
}

describe('OfflineBanner', () => {
  it('announces when the connection drops and hides when it returns', () => {
    render(<OfflineBanner />)
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument()

    act(() => {
      setOnline(false)
    })
    expect(screen.getByRole('status')).toHaveTextContent(/Sin conexión/)

    act(() => {
      setOnline(true)
    })
    expect(screen.queryByText(/Sin conexión/)).not.toBeInTheDocument()
  })
})

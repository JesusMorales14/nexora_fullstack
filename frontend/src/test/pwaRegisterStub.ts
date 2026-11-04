import type { useRegisterSW as UseRegisterSW } from 'virtual:pwa-register/react'

/**
 * Test stand-in for `virtual:pwa-register/react` (vite-plugin-pwa's virtual module does not exist
 * under Vitest, and tests never register a service worker). Tests that need it use vi.mock.
 */
export const useRegisterSW: typeof UseRegisterSW = () => ({
  needRefresh: [false, () => undefined],
  offlineReady: [false, () => undefined],
  updateServiceWorker: () => Promise.resolve(),
})

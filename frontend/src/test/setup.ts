// Adds DOM matchers (toBeInTheDocument, toHaveAccessibleName, ...) to Vitest's expect.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@/test/msw/server'

// Any request without a handler fails the test: no accidental real network calls.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  // Vitest does not enable globals here, so RTL cannot register its auto-cleanup.
  cleanup()
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

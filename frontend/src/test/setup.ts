// Adds DOM matchers (toBeInTheDocument, toHaveAccessibleName, ...) to Vitest's expect.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@/test/msw/server'

// Route changes chain several lazy chunks plus API calls; 1s (the default) is tight on CI.
configure({ asyncUtilTimeout: 3_000 })

// jsdom does not implement scrolling; ScrollRestoration and pagination call it.
window.scrollTo = () => undefined

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

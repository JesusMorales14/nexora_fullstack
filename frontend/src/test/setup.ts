// Adds DOM matchers (toBeInTheDocument, toHaveAccessibleName, ...) to Vitest's expect.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest does not enable globals here, so RTL cannot register its auto-cleanup.
afterEach(() => {
  cleanup()
})

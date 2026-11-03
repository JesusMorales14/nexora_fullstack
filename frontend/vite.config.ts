import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/ — https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Keep in sync with "paths" in tsconfig.app.json: TypeScript only type-checks
    // the alias, Vite is the one that actually resolves it at build/test time.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})

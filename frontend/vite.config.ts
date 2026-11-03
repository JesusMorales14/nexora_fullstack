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
  server: {
    // Same-origin API in development: the browser talks to Vite, Vite forwards /api to
    // ASP.NET Core. This keeps cookies first-party and avoids CORS in dev (see ADR-0001).
    proxy: {
      '/api': {
        target: process.env.NEXORA_API_PROXY_TARGET ?? 'http://localhost:5080',
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Node's fetch needs an absolute URL; MSW intercepts this origin (src/test/msw/server.ts).
    env: { VITE_API_BASE_URL: 'http://localhost:3000/api/v1' },
  },
})

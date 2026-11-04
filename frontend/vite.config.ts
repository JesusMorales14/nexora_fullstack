import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

const API_PROXY_TARGET = process.env.NEXORA_API_PROXY_TARGET ?? 'http://localhost:5080'

/**
 * Content-Security-Policy for the production build, injected as a <meta> tag. Only production:
 * the dev server needs inline scripts for hot reload. The API origin (when it is not the same
 * origin) is allowed for fetch and for the SignalR WebSocket.
 *
 * `frame-ancestors` cannot be set from a <meta> tag; the hosting layer adds it as a header (phase 11).
 */
function contentSecurityPolicy(apiBaseUrl: string | undefined): Plugin {
  const apiOrigins: string[] = []
  if (apiBaseUrl && /^https?:\/\//.test(apiBaseUrl)) {
    const api = new URL(apiBaseUrl)
    apiOrigins.push(api.origin, `${api.protocol === 'https:' ? 'wss' : 'ws'}://${api.host}`)
  }

  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' https: data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigins.join(' ')}`.trim(),
    "manifest-src 'self'",
    "worker-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'nexora-content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
      {
        tag: 'meta',
        attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' },
        injectTo: 'head',
      },
    ],
  }
}

// https://vite.dev/config/ — https://vitest.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react(), tailwindcss(), contentSecurityPolicy(env.VITE_API_BASE_URL)],
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
      // `vite preview` reuses this proxy, so the production build can be tested locally too.
      proxy: {
        '/api': { target: API_PROXY_TARGET, changeOrigin: false },
        // SignalR hub (WebSockets, with long polling as transport fallback).
        '/hubs': { target: API_PROXY_TARGET, changeOrigin: false, ws: true },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      // Full-page flows (several lazy routes + typing) exceed 5s when the whole suite runs in parallel.
      testTimeout: 15_000,
      // Node's fetch needs an absolute URL; MSW intercepts this origin (src/test/msw/server.ts).
      env: { VITE_API_BASE_URL: 'http://localhost:3000/api/v1' },
    },
  }
})

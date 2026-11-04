import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
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

/** Private or per-user areas: never crawled (the SPA also marks them noindex). */
const ROBOTS_DISALLOW = [
  '/admin',
  '/account',
  '/cart',
  '/checkout',
  '/orders',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/',
  '/hubs/',
]

/**
 * Emits robots.txt at build time. The Sitemap directive must be an absolute URL, so it is only
 * added when VITE_SITE_URL (the public storefront origin) is known.
 */
function robotsTxt(siteUrl: string | undefined): Plugin {
  return {
    name: 'nexora-robots-txt',
    apply: 'build',
    generateBundle() {
      const lines = ['User-agent: *', ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`)]
      if (siteUrl) lines.push('', `Sitemap: ${new URL('/sitemap.xml', siteUrl).toString()}`)
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `${lines.join('\n')}\n` })
    },
  }
}

const THEME_COLOR = '#1e1b4b'

/**
 * Installable PWA with an offline-capable shell (see ADR-0009). Safety rules:
 * - Only the app shell and static assets are precached.
 * - Runtime caching covers just images and the *public* catalog API; auth, cart, checkout,
 *   orders, admin and the SignalR hub always go to the network and are never stored.
 * - A new version waits for the user ("Actualizar") instead of reloading mid-checkout.
 */
function progressiveWebApp() {
  return VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    // The service worker only exists in production builds: dev and tests are never cached.
    devOptions: { enabled: false },
    includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
    manifest: {
      id: '/',
      name: 'Nexora | Tienda de tecnología',
      short_name: 'Nexora',
      description:
        'Laptops, monitores, periféricos y más con precios en soles y envío a todo el Perú.',
      lang: 'es-PE',
      dir: 'ltr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      theme_color: THEME_COLOR,
      background_color: '#ffffff',
      categories: ['shopping'],
      icons: [
        { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        {
          src: 'maskable-icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      // Product pictures are cached on demand (below), not shipped with every install.
      globIgnores: ['images/products/**'],
      cleanupOutdatedCaches: true,
      // Offline navigations get the SPA shell, except URLs the server must answer itself.
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [
        /^\/api\//,
        /^\/hubs\//,
        /^\/seo\//,
        /^\/sitemap\.xml$/,
        /^\/robots\.txt$/,
      ],
      runtimeCaching: [
        {
          urlPattern: /\.(?:png|jpe?g|webp|avif|gif|svg)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'nexora-images',
            expiration: { maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 },
            cacheableResponse: { statuses: [200] },
          },
        },
        {
          // Public, anonymous catalog reads only. NetworkFirst (not stale-while-revalidate):
          // online users always see current prices and stock, the cache is just the offline copy.
          urlPattern: /\/api\/v1\/(?:products|categories|brands)(?:\/[^/?#]+)?(?:\?.*)?$/,
          method: 'GET',
          handler: 'NetworkFirst',
          options: {
            cacheName: 'nexora-catalog-api',
            networkTimeoutSeconds: 4,
            expiration: { maxEntries: 80, maxAgeSeconds: 24 * 60 * 60 },
            cacheableResponse: { statuses: [200] },
          },
        },
      ],
    },
  })
}

const apiProxy = {
  '/api': { target: API_PROXY_TARGET, changeOrigin: false },
  // SignalR hub (WebSockets, with long polling as transport fallback).
  '/hubs': { target: API_PROXY_TARGET, changeOrigin: false, ws: true },
}

// https://vite.dev/config/ — https://vitest.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [
      react(),
      tailwindcss(),
      contentSecurityPolicy(env.VITE_API_BASE_URL),
      robotsTxt(env.VITE_SITE_URL),
      progressiveWebApp(),
    ],
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
      proxy: apiProxy,
    },
    // `vite preview` serves the production build like the real host will (ADR-0001): the API also
    // answers /sitemap.xml and the HTML of product pages (with server-rendered metadata).
    preview: {
      proxy: {
        ...apiProxy,
        '/sitemap.xml': { target: API_PROXY_TARGET, changeOrigin: false },
        '^/products/[^/?#]+$': {
          target: API_PROXY_TARGET,
          changeOrigin: false,
          rewrite: (path) => `/seo${path}`,
          // Only page navigations; anything else is served by the preview server as usual.
          bypass: (request) =>
            request.headers.accept?.includes('text/html') ? undefined : request.url,
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      alias: {
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./src/test/pwaRegisterStub.ts', import.meta.url),
        ),
      },
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
      // Full-page flows (several lazy routes + typing) exceed 5s when the whole suite runs in parallel.
      testTimeout: 15_000,
      // Node's fetch needs an absolute URL; MSW intercepts this origin (src/test/msw/server.ts).
      env: { VITE_API_BASE_URL: 'http://localhost:3000/api/v1' },
    },
  }
})

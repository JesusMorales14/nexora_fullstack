import { defineConfig, devices } from '@playwright/test'

const PREVIEW_URL = 'http://localhost:4173'
const API_HEALTH_URL = 'http://localhost:5080/health'
const SERVER_START_TIMEOUT_MS = 180_000
const isCi = Boolean(process.env.CI)

/**
 * End-to-end tests against the real stack: ASP.NET Core API (Development profile, seeded demo
 * catalog) and the *production* build served by `vite preview`, so the CSP is exercised too.
 * The API needs its database and secrets configured (see README); locally running servers are reused.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  // Whole-run ceiling: if anything hangs (a server, a browser), fail with a report instead of waiting.
  globalTimeout: isCi ? 20 * 60_000 : undefined,
  reporter: isCi ? [['github'], ['html', { open: 'never' }]] : 'list',
  // Pages load lazy chunks plus API data while several browsers run in parallel: 5s (the default)
  // causes false failures under load. Assertions still pass as soon as the condition holds.
  expect: { timeout: 15_000 },
  use: {
    baseURL: PREVIEW_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Same flows on a phone-sized screen (Chromium engine, touch, mobile viewport).
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // CI compiles the API in an earlier step: `dotnet run` building here leaves MSBuild/compiler
      // server processes holding the output open, and Playwright then never finishes its teardown.
      command: `dotnet run ${isCi ? '--no-build ' : ''}--project ../backend/src/Nexora.Api --launch-profile http`,
      url: API_HEALTH_URL,
      // Product pages are rendered by the API from the built index.html served by `vite preview`.
      env: { Frontend__IndexHtmlUrl: `${PREVIEW_URL}/index.html` },
      reuseExistingServer: !isCi,
      timeout: SERVER_START_TIMEOUT_MS,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm build && pnpm preview --port 4173 --strictPort',
      url: PREVIEW_URL,
      reuseExistingServer: !isCi,
      timeout: SERVER_START_TIMEOUT_MS,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
  ],
})

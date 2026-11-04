import { expect, test } from '@playwright/test'

import { expectNoCspViolations, trackCspViolations } from './support'

const PRODUCT_SLUG = 'logitech-mx-keys-s'
const PRODUCT_NAME = 'Logitech MX Keys S'

test.describe('SEO', () => {
  test('crawlers get robots.txt, the sitemap and product metadata without JavaScript', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain('Disallow: /admin')
    expect(robots).toContain('Disallow: /checkout')

    const sitemap = await request.get('/sitemap.xml')
    expect(sitemap.ok()).toBe(true)
    expect(await sitemap.text()).toContain(`/products/${PRODUCT_SLUG}</loc>`)

    // A crawler asking for the page (HTML) gets the shell with the product's metadata already in it.
    const page = await request.get(`/products/${PRODUCT_SLUG}`, {
      headers: { Accept: 'text/html' },
    })
    expect(page.ok()).toBe(true)
    const html = await page.text()
    expect(html).toContain(`<title data-server-seo>${PRODUCT_NAME} | Nexora</title>`)
    expect(html).toContain('property="og:title"')
    expect(html).toContain('<script type="application/ld+json"')
    expect(html).toContain('http-equiv="Content-Security-Policy"')

    const missing = await request.get('/products/no-existe', { headers: { Accept: 'text/html' } })
    expect(missing.status()).toBe(404)
  })

  test('the running app keeps a single set of metadata per page', async ({ page }) => {
    const cspViolations = await trackCspViolations(page)

    await page.goto(`/products/${PRODUCT_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: PRODUCT_NAME })).toBeVisible()

    await expect(page).toHaveTitle(`${PRODUCT_NAME} | Nexora`)
    await expect(page.locator('head title')).toHaveCount(1)
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1)
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/products/${PRODUCT_SLUG}$`),
    )
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1)

    // Private and filtered pages are kept out of search results.
    await page.goto('/cart')
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    await page.goto('/products?q=mouse')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('mouse')
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    expectNoCspViolations(cspViolations)
  })
})

test.describe('PWA', () => {
  test('is installable: manifest with standard and maskable icons', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest')
    expect(response.ok()).toBe(true)
    const manifest = (await response.json()) as {
      name: string
      display: string
      start_url: string
      icons: { sizes: string; purpose?: string }[]
    }

    expect(manifest).toMatchObject({ short_name: 'Nexora', display: 'standalone', start_url: '/' })
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    )
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  })

  test('a visited product still opens offline, with a clear offline notice', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    // First visit installs the service worker; it controls the page from the next load on.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true)

    await page.goto(`/products/${PRODUCT_SLUG}`)
    await expect(page.getByRole('heading', { level: 1, name: PRODUCT_NAME })).toBeVisible()

    await context.setOffline(true)
    await page.reload()

    await expect(page.getByRole('heading', { level: 1, name: PRODUCT_NAME })).toBeVisible()
    await expect(page.getByText(/Sin conexión/)).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText(/Sin conexión/)).toBeHidden()
  })
})

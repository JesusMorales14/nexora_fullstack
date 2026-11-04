import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Automated checks catch a large share of WCAG issues (contrast, names, landmarks, ARIA misuse);
// keyboard and screen reader passes are still done by hand (docs/quality/accessibility.md).
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const PUBLIC_PAGES = [
  { name: 'inicio', path: '/', ready: 'Tecnología que te impulsa' },
  { name: 'catálogo', path: '/products', ready: 'Catálogo' },
  { name: 'detalle de producto', path: '/products/sony-wh-1000xm5', ready: 'Sony WH-1000XM5' },
  { name: 'carrito vacío', path: '/cart', ready: 'Carrito' },
  { name: 'login', path: '/login', ready: 'Iniciar sesión' },
  { name: 'registro', path: '/register', ready: 'Crear cuenta' },
  { name: 'recuperar contraseña', path: '/forgot-password', ready: 'Recuperar contraseña' },
  { name: '404', path: '/no-existe', ready: 'Página no encontrada' },
]

for (const { name, path, ready } of PUBLIC_PAGES) {
  test(`${name} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: ready })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()

    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => node.target.join(' ')),
      })),
    ).toEqual([])
  })
}

test('form errors are announced and keep WCAG compliance', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page.getByText('Ingresa tu nombre.')).toBeVisible()

  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  expect(results.violations.map((violation) => violation.id)).toEqual([])
})

test('the store can be used with the keyboard only', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop concern.')
  await page.goto('/')

  // First Tab reaches the skip link, which moves focus to the main content.
  await page.keyboard.press('Tab')
  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' })
  await expect(skipLink).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()

  // The search form works without a mouse.
  await page.getByRole('searchbox', { name: 'Buscar productos' }).focus()
  await page.keyboard.type('monitor')
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Resultados para “monitor”' }),
  ).toBeVisible()
})

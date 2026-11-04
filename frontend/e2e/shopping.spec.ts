import { expect, test } from '@playwright/test'

import { expectNoCspViolations, register, trackCspViolations, uniqueEmail } from './support'

// The G305 in black has the largest seeded stock, so repeated runs keep finding units.
const PRODUCT_NAME = 'Logitech G305 Lightspeed'

test('a visitor finds a product, signs up during checkout and pays (simulated)', async ({
  page,
}) => {
  const cspViolations = await trackCspViolations(page)
  const email = uniqueEmail('comprador')

  await page.goto('/')
  await expect(page).toHaveTitle(/Nexora/)

  // Browse through the category chips on the home page.
  await page.getByRole('link', { name: 'Periféricos' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Catálogo' })).toBeVisible()
  await page.getByRole('link', { name: PRODUCT_NAME }).click()

  await expect(page.getByRole('heading', { level: 1, name: PRODUCT_NAME })).toBeVisible()
  await page.getByRole('radio', { name: /Negro/ }).check()
  await page.getByRole('button', { name: 'Añadir al carrito' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Añadiste 1' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Carrito de compras, 1 producto' })).toBeVisible()

  await page.getByRole('link', { name: 'Carrito de compras, 1 producto' }).click()
  await expect(page.getByRole('link', { name: PRODUCT_NAME })).toBeVisible()
  await page.getByRole('link', { name: 'Continuar con la compra' }).click()

  // Checkout needs an account: login page → "create one", keeping the destination.
  await expect(page.getByRole('heading', { level: 1, name: 'Iniciar sesión' })).toBeVisible()
  await page.getByRole('link', { name: 'Crear una cuenta' }).click()
  await register(page, { name: 'Compradora E2E', email })

  await expect(page.getByRole('heading', { level: 1, name: 'Datos de envío' })).toBeVisible()
  await expect(page.getByLabel('Nombre de quien recibe')).toHaveValue('Compradora E2E')
  await page.getByLabel('Celular').fill('987654321')
  await page.getByLabel('Departamento').selectOption('Arequipa')
  await page.getByLabel('Provincia').fill('Arequipa')
  await page.getByLabel('Distrito').fill('Cayma')
  await page.getByLabel('Dirección').fill('Av. Ejército 123')
  // Shipping is quoted by the API for the destination.
  await expect(page.getByText('Provincias: 3 a 5 días hábiles')).toBeVisible()
  await page.getByRole('button', { name: 'Ir a pagar' }).click()

  await expect(page.getByText(/Modo de prueba/)).toBeVisible()
  await page.getByRole('button', { name: 'Aprobar pago' }).click()

  await expect(
    page.getByRole('heading', { level: 1, name: '¡Gracias por tu compra!' }),
  ).toBeVisible()
  await expect(page.getByText('Pagado').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Carrito de compras, vacío' })).toBeVisible()

  await page.goto('/account/orders')
  await expect(page.getByRole('link', { name: /Pedido NX-/ }).first()).toBeVisible()

  expectNoCspViolations(cspViolations)
})

test('the catalog can be filtered and sorted from the URL', async ({ page }) => {
  await page.goto('/products?category=monitores&sort=price_asc')

  await expect(page.getByText('3 productos')).toBeVisible()
  const prices = await page
    .getByRole('region', { name: 'Productos' })
    .getByText(/^S\/\s/)
    .allTextContents()
  const amounts = prices.map((price) => Number(price.replace(/[^\d.]/g, '')))
  expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
})

test('unknown pages show a 404 with a way back', async ({ page }) => {
  await page.goto('/esta-pagina-no-existe')

  await expect(page.getByRole('heading', { level: 1, name: 'Página no encontrada' })).toBeVisible()
  await page.getByRole('link', { name: 'Volver al inicio' }).click()
  await expect(page).toHaveURL('/')
})

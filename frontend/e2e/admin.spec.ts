import { expect, test } from '@playwright/test'

import { register, uniqueEmail } from './support'

const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD

test('customers cannot open the admin panel', async ({ page }) => {
  await page.goto('/register')
  await register(page, { name: 'Cliente E2E', email: uniqueEmail('cliente') })
  await expect(page.getByRole('heading', { level: 1, name: 'Mi cuenta' })).toBeVisible()

  await page.goto('/admin')

  await expect(
    page.getByRole('heading', { level: 1, name: 'No tienes acceso a esta sección' }),
  ).toBeVisible()
})

test.describe('as administrator', () => {
  test.skip(!adminEmail || !adminPassword, 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.')

  test('creates a draft, publishes it and hides it again', async ({ page }) => {
    const suffix = Date.now().toString(36)
    const name = `Teclado E2E ${suffix}`

    await page.goto('/login?returnTo=%2Fadmin%2Fproducts%2Fnew')
    await page.getByLabel('Correo electrónico').fill(adminEmail ?? '')
    await page.getByLabel('Contraseña').fill(adminPassword ?? '')
    await page.getByRole('button', { name: 'Ingresar' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'Nuevo producto' })).toBeVisible()
    await page.getByLabel('Nombre', { exact: true }).fill(name)
    await expect(page.getByLabel('Slug (URL)')).toHaveValue(`teclado-e2e-${suffix}`)
    await page.getByLabel('Descripción').fill('Producto creado por la prueba end-to-end.')
    await page.getByLabel('Categoría').selectOption({ label: 'Periféricos › Teclados' })
    await page.getByLabel('Marca').selectOption({ label: 'Redragon' })
    await page.getByLabel('SKU').fill(`E2E-${suffix.toUpperCase()}`)
    await page.getByLabel('Nombre de la variante').fill('Switch Red')
    await page.getByLabel('Precio (S/, con IGV)').fill('199.90')
    await page.getByLabel('Stock inicial').fill('3')
    await page.getByLabel('Texto alternativo').fill('Teclado mecánico visto desde arriba')
    await page.getByRole('button', { name: 'Crear producto' }).click()

    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    // Drafts are invisible in the store.
    const storefront = await page.request.get(`/api/v1/products/teclado-e2e-${suffix}`)
    expect(storefront.status()).toBe(404)

    await page.getByLabel('Publicado en la tienda').check()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados.')).toBeVisible()
    await page.getByRole('link', { name: 'Ver en la tienda' }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()

    // Clean up: leave the shared catalog as it was.
    await page.goBack()
    await page.getByLabel('Publicado en la tienda').uncheck()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.getByText('Cambios guardados.')).toBeVisible()
  })
})

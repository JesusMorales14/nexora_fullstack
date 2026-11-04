import { expect, type Page } from '@playwright/test'

/** Unique per test run: tests share the development database and must not collide. */
export function uniqueEmail(prefix = 'e2e') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@nexora.test`
}

export const E2E_PASSWORD = 'clave-e2e-suficientemente-larga'

/** Collects Content-Security-Policy violations so a test can assert the page triggered none. */
export async function trackCspViolations(page: Page): Promise<string[]> {
  const violations: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Content Security Policy')) {
      violations.push(message.text())
    }
  })
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      console.error(
        `Content Security Policy violation: ${event.violatedDirective} ${event.blockedURI}`,
      )
    })
  })
  return violations
}

export async function register(page: Page, { name, email }: { name: string; email: string }) {
  await page.getByLabel('Nombre completo').fill(name)
  await page.getByLabel('Correo electrónico').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(E2E_PASSWORD)
  await page.getByLabel('Confirmar contraseña').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
}

export function expectNoCspViolations(violations: string[]) {
  expect(violations, violations.join('\n')).toEqual([])
}

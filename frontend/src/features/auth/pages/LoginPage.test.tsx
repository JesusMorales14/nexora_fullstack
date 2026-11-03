import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { customerFixture, problem, signedInAs, TEST_CSRF_TOKEN } from '@/test/msw/authFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

describe('LoginPage', () => {
  it('validates the form before calling the API', async () => {
    const user = userEvent.setup()
    renderRoute('/login')

    await user.click(await screen.findByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Ingresa tu correo.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa tu contraseña.')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus()
  })

  it('signs in with the CSRF header and goes back to the requested page', async () => {
    let csrfHeader: string | null = null
    server.use(
      http.post(apiUrl('auth/login'), ({ request }) => {
        csrfHeader = request.headers.get('X-XSRF-TOKEN')
        server.use(signedInAs(customerFixture))
        return HttpResponse.json(customerFixture)
      }),
    )
    const user = userEvent.setup()
    const { router } = renderRoute('/login?returnTo=%2Fproducts%3Fbrand%3Dsony')

    await user.type(await screen.findByLabelText('Correo electrónico'), customerFixture.email)
    await user.type(screen.getByLabelText('Contraseña'), 'una-clave-larga')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await screen.findByRole('heading', { level: 1, name: 'Catálogo' })
    expect(router.state.location.pathname).toBe('/products')
    expect(router.state.location.search).toBe('?brand=sony')
    expect(csrfHeader).toBe(TEST_CSRF_TOKEN)
  })

  it('ignores external returnTo URLs (open redirect)', async () => {
    server.use(
      http.post(apiUrl('auth/login'), () => {
        server.use(signedInAs(customerFixture))
        return HttpResponse.json(customerFixture)
      }),
    )
    const user = userEvent.setup()
    const { router } = renderRoute('/login?returnTo=https%3A%2F%2Fevil.example')

    await user.type(await screen.findByLabelText('Correo electrónico'), customerFixture.email)
    await user.type(screen.getByLabelText('Contraseña'), 'una-clave-larga')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' })
    expect(router.state.location.pathname).toBe('/account')
  })

  it('shows the server message for invalid credentials', async () => {
    server.use(
      http.post(apiUrl('auth/login'), () =>
        problem(401, { title: 'Invalid credentials', detail: 'Correo o contraseña incorrectos.' }),
      ),
    )
    const user = userEvent.setup()
    renderRoute('/login')

    await user.type(await screen.findByLabelText('Correo electrónico'), 'ana@nexora.test')
    await user.type(screen.getByLabelText('Contraseña'), 'equivocada')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
  })
})

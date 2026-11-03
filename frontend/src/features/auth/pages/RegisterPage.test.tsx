import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it } from 'vitest'

import { problem } from '@/test/msw/authFixtures'
import { apiUrl, server } from '@/test/msw/server'
import { renderRoute } from '@/test/renderRoute'

async function fillForm(password: string, confirmPassword = password) {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Nombre completo'), 'Ana Pérez')
  await user.type(screen.getByLabelText('Correo electrónico'), 'ana@nexora.test')
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.type(screen.getByLabelText('Confirmar contraseña'), confirmPassword)
  await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
}

describe('RegisterPage', () => {
  it('requires matching passwords of the minimum length', async () => {
    renderRoute('/register')

    await fillForm('corta', 'distinta')

    expect(await screen.findByText('Usa al menos 10 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument()
  })

  it('shows server validation errors next to the right field', async () => {
    server.use(
      http.post(apiUrl('auth/register'), () =>
        problem(400, {
          title: 'One or more validation errors occurred.',
          errors: { email: ['Ya existe una cuenta con este correo.'] },
        }),
      ),
    )
    renderRoute('/register')

    await fillForm('una-clave-larga-y-segura')

    const emailError = await screen.findByText('Ya existe una cuenta con este correo.')
    expect(screen.getByLabelText('Correo electrónico')).toHaveAccessibleDescription(
      emailError.textContent,
    )
  })
})

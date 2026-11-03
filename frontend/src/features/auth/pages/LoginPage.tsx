import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { useLoginMutation } from '@/features/auth/api/authApi'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { type LoginFormValues, loginSchema } from '@/features/auth/schemas'
import type { ApiError } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'
import { getSafeRedirectPath } from '@/lib/utils/safeRedirect'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = getSafeRedirectPath(searchParams.get('returnTo'), '/account')
  const [login, { isLoading }] = useLoginMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  async function handleValidSubmit(values: LoginFormValues) {
    setFormError(null)
    try {
      await login(values).unwrap()
      void navigate(returnTo, { replace: true })
    } catch (error: unknown) {
      setFormError(
        applyServerErrors(error as ApiError, setError, { email: 'email', password: 'password' }),
      )
    }
  }

  return (
    <AuthCard
      title="Iniciar sesión"
      description="Accede para comprar y revisar tus pedidos."
      footer={
        <>
          ¿No tienes cuenta?{' '}
          <Link
            to={`/register?${new URLSearchParams({ returnTo }).toString()}`}
            className="font-medium text-primary hover:underline"
          >
            Crear una cuenta
          </Link>
        </>
      }
    >
      {formError && <FormAlert message={formError} />}

      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <FormField
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Contraseña"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex items-center justify-between gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-primary" {...register('rememberMe')} />
            Mantener sesión iniciada
          </label>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" size="lg" className="h-10" disabled={isLoading}>
          {isLoading ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </AuthCard>
  )
}

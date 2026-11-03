import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { useRegisterMutation } from '@/features/auth/api/authApi'
import { AuthCard } from '@/features/auth/components/AuthCard'
import {
  PASSWORD_MIN_LENGTH,
  type RegisterFormValues,
  registerSchema,
} from '@/features/auth/schemas'
import type { ApiError } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'
import { getSafeRedirectPath } from '@/lib/utils/safeRedirect'

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = getSafeRedirectPath(searchParams.get('returnTo'), '/account')
  const [registerAccount, { isLoading }] = useRegisterMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  async function handleValidSubmit({ fullName, email, password }: RegisterFormValues) {
    setFormError(null)
    try {
      await registerAccount({ fullName, email, password }).unwrap()
      void navigate(returnTo, { replace: true })
    } catch (error: unknown) {
      setFormError(
        applyServerErrors(error as ApiError, setError, {
          fullName: 'fullName',
          email: 'email',
          password: 'password',
        }),
      )
    }
  }

  return (
    <AuthCard
      title="Crear cuenta"
      description="Regístrate para comprar y seguir tus pedidos."
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
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
          label="Nombre completo"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
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
          autoComplete="new-password"
          hint={`Mínimo ${String(PASSWORD_MIN_LENGTH)} caracteres. Una frase larga es más segura.`}
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" size="lg" className="h-10" disabled={isLoading}>
          {isLoading ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
    </AuthCard>
  )
}

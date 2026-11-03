import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { useResetPasswordMutation } from '@/features/auth/api/authApi'
import { AuthCard } from '@/features/auth/components/AuthCard'
import {
  PASSWORD_MIN_LENGTH,
  type ResetPasswordFormValues,
  resetPasswordSchema,
} from '@/features/auth/schemas'
import type { ApiError } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  // Read once from the emailed link, then removed from the address bar (see effect below).
  const [{ email, token }] = useState(() => ({
    email: searchParams.get('email') ?? '',
    token: searchParams.get('token') ?? '',
  }))
  const [resetPassword, { isLoading, isSuccess }] = useResetPasswordMutation()
  const [formError, setFormError] = useState<string | null>(null)

  // Keep the reset token out of the browser history and out of Referer headers.
  useEffect(() => {
    if (searchParams.has('token')) void navigate('/reset-password', { replace: true })
  }, [searchParams, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function handleValidSubmit({ newPassword }: ResetPasswordFormValues) {
    setFormError(null)
    try {
      await resetPassword({ email, token, newPassword }).unwrap()
    } catch (error: unknown) {
      setFormError(
        applyServerErrors(error as ApiError, setError, {
          password: 'newPassword',
          newPassword: 'newPassword',
        }),
      )
    }
  }

  const forgotPasswordLink = (
    <Link to="/forgot-password" className="font-medium text-primary hover:underline">
      Solicitar un enlace nuevo
    </Link>
  )

  if (!email || !token) {
    return (
      <AuthCard title="Enlace no válido" footer={forgotPasswordLink}>
        <FormAlert message="El enlace para restablecer la contraseña está incompleto o ya se usó." />
      </AuthCard>
    )
  }

  if (isSuccess) {
    return (
      <AuthCard title="Contraseña actualizada">
        <FormAlert
          variant="success"
          message="Tu contraseña se cambió correctamente. Por seguridad, cerramos tus otras sesiones."
        />
        <Button asChild size="lg" className="h-10">
          <Link to="/login">Iniciar sesión</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Nueva contraseña"
      description={`Para la cuenta ${email}`}
      footer={forgotPasswordLink}
    >
      {formError && <FormAlert message={formError} />}
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(handleValidSubmit)(event)}
        className="flex flex-col gap-4"
      >
        <FormField
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint={`Mínimo ${String(PASSWORD_MIN_LENGTH)} caracteres.`}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <FormField
          label="Confirmar contraseña"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="lg" className="h-10" disabled={isLoading}>
          {isLoading ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </AuthCard>
  )
}

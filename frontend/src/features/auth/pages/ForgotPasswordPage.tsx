import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'

import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { useForgotPasswordMutation } from '@/features/auth/api/authApi'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { type ForgotPasswordFormValues, forgotPasswordSchema } from '@/features/auth/schemas'
import type { ApiError } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'

export function ForgotPasswordPage() {
  const [requestReset, { isLoading, isSuccess }] = useForgotPasswordMutation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function handleValidSubmit(values: ForgotPasswordFormValues) {
    setFormError(null)
    try {
      await requestReset(values).unwrap()
    } catch (error: unknown) {
      setFormError(applyServerErrors(error as ApiError, setError, { email: 'email' }))
    }
  }

  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una nueva contraseña."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      {isSuccess ? (
        // Same message whether or not the account exists (the API does not reveal it either).
        <FormAlert
          variant="success"
          message="Si existe una cuenta con ese correo, recibirás un enlace válido por 1 hora."
        />
      ) : (
        <>
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
            <Button type="submit" size="lg" className="h-10" disabled={isLoading}>
              {isLoading ? 'Enviando…' : 'Enviar enlace'}
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  )
}

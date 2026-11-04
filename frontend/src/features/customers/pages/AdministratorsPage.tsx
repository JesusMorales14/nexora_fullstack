import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from '@/lib/validation/z'

import { ErrorState } from '@/components/shared/ErrorState'
import { FormAlert } from '@/components/shared/FormAlert'
import { FormField } from '@/components/shared/FormField'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  type Administrator,
  useGetAdministratorsQuery,
  useGrantAdministratorMutation,
  useRevokeAdministratorMutation,
} from '@/features/customers/adminCustomersApi'
import { type ApiError, getErrorMessage, getProblemDetail } from '@/lib/api/apiErrors'
import { applyServerErrors } from '@/lib/api/formErrors'

const grantSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa el correo.').pipe(z.email('Ingresa un correo válido.')),
})

type GrantValues = z.infer<typeof grantSchema>

export function AdministratorsPage() {
  const { data: admins, error, isLoading, isError, refetch } = useGetAdministratorsQuery()
  const [grant, { isLoading: isGranting }] = useGrantAdministratorMutation()
  const [revoke] = useRevokeAdministratorMutation()
  const [notice, setNotice] = useState<{ kind: 'error' | 'success'; message: string } | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<GrantValues>({ resolver: zodResolver(grantSchema), defaultValues: { email: '' } })

  async function handleGrant(values: GrantValues) {
    setNotice(null)
    try {
      const admin = await grant(values).unwrap()
      reset()
      setNotice({ kind: 'success', message: `${admin.email} ahora es administrador.` })
    } catch (caught: unknown) {
      const message = applyServerErrors(caught as ApiError, setError, { email: 'email' })
      if (message) setNotice({ kind: 'error', message })
    }
  }

  async function handleRevoke(admin: Administrator) {
    setNotice(null)
    try {
      await revoke(admin.id).unwrap()
      setNotice({ kind: 'success', message: `${admin.email} ya no es administrador.` })
    } catch (caught: unknown) {
      const apiError = caught as ApiError
      setNotice({ kind: 'error', message: getProblemDetail(apiError) ?? getErrorMessage(apiError) })
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <title>Administradores | Nexora Admin</title>
      <PageHeader
        title="Administradores"
        description="Quitar el permiso cierra las sesiones de esa persona en como máximo 5 minutos."
      />
      {notice && <FormAlert variant={notice.kind} message={notice.message} />}

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {admins?.map((admin) => (
            <li key={admin.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {admin.fullName}{' '}
                  {admin.isCurrentUser && <span className="text-muted-foreground">(tú)</span>}
                </p>
                <p className="text-sm text-muted-foreground">{admin.email}</p>
              </div>
              {!admin.isCurrentUser && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Quitar permisos
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Quitar permisos a {admin.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Seguirá pudiendo comprar como cliente, pero perderá el acceso al panel.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void handleRevoke(admin)}>
                        Quitar permisos
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </li>
          ))}
        </ul>
      )}

      <section
        aria-labelledby="grant-heading"
        className="flex flex-col gap-3 rounded-xl border bg-card p-5"
      >
        <h2 id="grant-heading" className="font-semibold">
          Agregar administrador
        </h2>
        <p className="text-sm text-muted-foreground">
          La persona debe tener una cuenta registrada.
        </p>
        <form
          noValidate
          onSubmit={(event) => void handleSubmit(handleGrant)(event)}
          className="flex flex-col gap-3 sm:flex-row sm:items-start"
        >
          <div className="flex-1">
            <FormField
              label="Correo de la cuenta"
              type="email"
              autoComplete="off"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>
          <Button type="submit" className="sm:mt-6" disabled={isGranting}>
            Otorgar permisos
          </Button>
        </form>
      </section>
    </div>
  )
}

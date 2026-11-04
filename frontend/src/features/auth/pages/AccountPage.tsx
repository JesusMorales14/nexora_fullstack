import { LogOut, Package, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { FormAlert } from '@/components/shared/FormAlert'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { type ApiError, getErrorMessage } from '@/lib/api/apiErrors'

export function AccountPage() {
  const { user, isAdmin } = useCurrentUser()
  const { signOut, isSigningOut } = useSignOut()
  const [logoutError, setLogoutError] = useState<string | null>(null)

  async function handleLogout() {
    setLogoutError(null)
    try {
      await signOut()
    } catch (error: unknown) {
      setLogoutError(getErrorMessage(error as ApiError))
    }
  }

  // RequireAuth guarantees a user here; the check keeps the types honest.
  if (!user) return null

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <title>Mi cuenta | Nexora</title>
      <h1 className="text-3xl font-bold tracking-tight">Mi cuenta</h1>

      {logoutError && <FormAlert message={logoutError} />}

      <section aria-labelledby="profile-heading" className="rounded-xl border p-6">
        <h2 id="profile-heading" className="mb-4 text-lg font-semibold">
          Datos personales
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-[160px_1fr]">
          <dt className="text-muted-foreground">Nombre</dt>
          <dd className="font-medium">{user.fullName}</dd>
          <dt className="text-muted-foreground">Correo</dt>
          <dd className="font-medium">{user.email}</dd>
        </dl>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="lg">
          <Link to="/account/orders">
            <Package aria-hidden="true" />
            Mis pedidos
          </Link>
        </Button>
        {isAdmin && (
          <Button asChild variant="outline" size="lg">
            <Link to="/admin">
              <ShieldCheck aria-hidden="true" />
              Panel de administración
            </Link>
          </Button>
        )}
        <Button
          variant="outline"
          size="lg"
          onClick={() => void handleLogout()}
          disabled={isSigningOut}
        >
          <LogOut aria-hidden="true" />
          {isSigningOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </Button>
      </div>
    </div>
  )
}

import { CircleUser } from 'lucide-react'
import { NavLink } from 'react-router'

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { cn } from '@/lib/utils/cn'

interface AccountNavLinkProps {
  className: (state: { isActive: boolean }) => string
}

export function AccountNavLink({ className }: AccountNavLinkProps) {
  const { user, isLoading } = useCurrentUser()

  // Reserve the space while the session loads to avoid a layout shift in the header.
  if (isLoading) return <span aria-hidden="true" className="inline-block h-9 w-20" />

  if (!user) {
    return (
      <NavLink to="/login" className={className}>
        Ingresar
      </NavLink>
    )
  }

  const firstName = user.fullName.split(' ')[0] ?? user.fullName

  return (
    <NavLink
      to="/account"
      className={(state) => cn(className(state), 'flex items-center gap-1.5')}
      aria-label={`Mi cuenta (${user.fullName})`}
    >
      <CircleUser aria-hidden="true" className="size-5" />
      <span className="hidden sm:inline">{firstName}</span>
    </NavLink>
  )
}

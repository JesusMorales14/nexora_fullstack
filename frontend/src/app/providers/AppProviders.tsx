import type { ReactNode } from 'react'
import { Provider } from 'react-redux'

import { store } from '@/app/store/store'

interface AppProvidersProps {
  children: ReactNode
}

/** Global providers that wrap the router. Add new ones here, not in main.tsx. */
export function AppProviders({ children }: AppProvidersProps) {
  return <Provider store={store}>{children}</Provider>
}

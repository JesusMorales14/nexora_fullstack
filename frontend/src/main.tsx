import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { removeStaticHeadMetadata } from '@/lib/seo/seo'
import '@/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element "#root" was not found in index.html')
}

removeStaticHeadMetadata()

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

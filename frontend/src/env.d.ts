/// <reference types="vite/client" />

// Only VITE_* variables reach the browser bundle: never put secrets here.
interface ImportMetaEnv {
  /** Base URL of the Nexora REST API. Defaults to the same-origin `/api/v1` (Vite proxy in dev). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Generates the PWA icons (64/192/512, maskable 512, apple-touch 180) from the favicon.
// Run `pnpm generate:pwa-assets` after changing public/favicon.svg; the PNGs are committed.
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
})

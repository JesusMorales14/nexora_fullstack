const SLUG_MAX_LENGTH = 120

/**
 * Builds a URL slug the API accepts: "Teclado Mecánico RGB 60%" → "teclado-mecanico-rgb-60".
 * Only a suggestion for the admin form; the API validates the final value.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents: á → a, ñ → n
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
}

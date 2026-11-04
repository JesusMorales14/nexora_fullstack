import { z } from 'zod'

// Mirror the API validators (AdminCatalogValidators) for instant feedback; the API decides.

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SKU_PATTERN = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/
const MAX_PRICE = 1_000_000

const priceField = z
  .number({ error: 'Ingresa un precio.' })
  .positive('El precio debe ser mayor a 0.')
  .max(MAX_PRICE, 'El precio es demasiado alto.')
  // Checked on the decimal text, not with value * 100 (19.99 * 100 = 1998.9999… in floating point).
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), {
    error: 'Usa como máximo 2 decimales.',
  })

/** Optional price typed as text: empty means "no previous price". */
const optionalPriceText = z
  .string()
  .trim()
  .refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) > 0), {
    error: 'Ingresa un precio válido o deja el campo vacío.',
  })

export const productDetailsSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa el nombre.').max(200),
  slug: z
    .string()
    .trim()
    .min(1, 'Ingresa un slug.')
    .max(120)
    .regex(SLUG_PATTERN, 'Usa solo minúsculas, números y guiones.'),
  description: z.string().trim().min(1, 'Ingresa una descripción.').max(5000),
  categoryId: z.string().min(1, 'Selecciona una categoría.'),
  brandId: z.string().min(1, 'Selecciona una marca.'),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
})

// Unrefined base: Zod 4 does not allow .omit() on a schema that already has refinements.
const variantFields = z.object({
  sku: z
    .string()
    .trim()
    .min(1, 'Ingresa el SKU.')
    .max(40)
    .regex(SKU_PATTERN, 'Usa letras, números y guiones.'),
  name: z.string().trim().min(1, 'Ingresa el nombre de la variante.').max(120),
  price: priceField,
  compareAtPrice: optionalPriceText,
  initialStock: z.number({ error: 'Ingresa el stock.' }).int().min(0).max(10_000),
  lowStockThreshold: z.number({ error: 'Ingresa el umbral.' }).int().min(0).max(1000),
})

function isCompareAtAbovePrice(variant: { price: number; compareAtPrice: string }) {
  return variant.compareAtPrice === '' || Number(variant.compareAtPrice) > variant.price
}

const compareAtAbovePriceError = {
  path: ['compareAtPrice'],
  error: 'El precio anterior debe ser mayor que el precio.',
}

export const variantSchema = variantFields.refine(isCompareAtAbovePrice, compareAtAbovePriceError)

export const imageSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Ingresa la URL de la imagen.')
    .refine((url) => (url.startsWith('/') && !url.startsWith('//')) || url.startsWith('https://'), {
      error: 'Usa una ruta del sitio (/images/...) o una URL https://.',
    }),
  altText: z.string().trim().min(1, 'Describe la imagen para lectores de pantalla.').max(200),
  width: z.number({ error: 'Ingresa el ancho.' }).int().min(1).max(10_000),
  height: z.number({ error: 'Ingresa el alto.' }).int().min(1).max(10_000),
})

export const createProductSchema = z.object({
  details: productDetailsSchema,
  variant: variantSchema,
  image: imageSchema,
})

export const editProductSchema = z.object({ details: productDetailsSchema })

// SKU and stock are not editable here: SKUs identify sold items, stock changes go through Inventory.
export const editVariantSchema = variantFields
  .omit({ sku: true, initialStock: true })
  .refine(isCompareAtAbovePrice, compareAtAbovePriceError)

export type ProductDetailsValues = z.infer<typeof productDetailsSchema>
export type VariantValues = z.infer<typeof variantSchema>
export type ImageValues = z.infer<typeof imageSchema>
export type CreateProductValues = z.infer<typeof createProductSchema>
export type EditProductValues = z.infer<typeof editProductSchema>

export function toCompareAtPrice(value: string): number | null {
  return value === '' ? null : Number(value)
}

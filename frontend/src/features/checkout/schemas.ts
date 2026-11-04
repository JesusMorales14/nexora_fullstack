import { z } from 'zod'

import { PERU_DEPARTMENTS } from '@/features/checkout/peruDepartments'

// Mirrors ShippingAddressRequestValidator in the API (which validates again).

export const shippingAddressSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre de quien recibe.')
    .max(120, 'El nombre es demasiado largo.'),
  phone: z
    .string()
    .trim()
    .regex(/^9\d{8}$/, 'Ingresa un celular de 9 dígitos que empiece con 9.'),
  department: z.enum(PERU_DEPARTMENTS, { error: 'Selecciona un departamento.' }),
  province: z.string().trim().min(1, 'Ingresa la provincia.').max(60),
  district: z.string().trim().min(1, 'Ingresa el distrito.').max(60),
  addressLine: z
    .string()
    .trim()
    .min(5, 'Ingresa la dirección completa.')
    .max(200, 'La dirección es demasiado larga.'),
  reference: z.string().trim().max(200, 'La referencia es demasiado larga.'),
})

export type ShippingAddressFormValues = z.infer<typeof shippingAddressSchema>

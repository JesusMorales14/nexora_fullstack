import { z } from '@/lib/validation/z'

// Client-side validation is for fast feedback only; the API validates everything again.
// Limits mirror Nexora.Api.Auth.AuthContracts and the Identity password policy.

export const PASSWORD_MIN_LENGTH = 10
const PASSWORD_MAX_LENGTH = 128
const FULL_NAME_MIN_LENGTH = 2
const FULL_NAME_MAX_LENGTH = 120
const EMAIL_MAX_LENGTH = 254

const emailField = z
  .string()
  .trim()
  .min(1, 'Ingresa tu correo.')
  .max(EMAIL_MAX_LENGTH, 'El correo es demasiado largo.')
  .pipe(z.email('Ingresa un correo válido.'))

const newPasswordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Usa al menos ${String(PASSWORD_MIN_LENGTH)} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, 'La contraseña es demasiado larga.')

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Ingresa tu contraseña.').max(PASSWORD_MAX_LENGTH),
  rememberMe: z.boolean(),
})

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(FULL_NAME_MIN_LENGTH, 'Ingresa tu nombre.')
      .max(FULL_NAME_MAX_LENGTH, 'El nombre es demasiado largo.'),
    email: emailField,
    password: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Las contraseñas no coinciden.',
  })

export const forgotPasswordSchema = z.object({ email: emailField })

export const resetPasswordSchema = z
  .object({
    newPassword: newPasswordField,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: 'Las contraseñas no coinciden.',
  })

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

// Mirrors Nexora.Api.Auth.AuthContracts.

export const ROLES = {
  admin: 'Admin',
  customer: 'Customer',
} as const

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  roles: string[]
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe: boolean
}

export interface RegisterRequest {
  email: string
  password: string
  fullName: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  token: string
  newPassword: string
}

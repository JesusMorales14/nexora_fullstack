import type {
  CurrentUser,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '@/features/auth/types'
import { baseApi, clearCsrfToken } from '@/lib/api/baseApi'

const HTTP_UNAUTHORIZED = 401

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** `null` means "anonymous": a 401 here is an expected answer, not an error. */
    getCurrentUser: build.query<CurrentUser | null, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const result = await baseQuery('auth/me')
        if (result.error?.status === HTTP_UNAUTHORIZED) return { data: null }
        if (result.error) return { error: result.error }
        return { data: result.data as CurrentUser }
      },
      providesTags: ['CurrentUser'],
    }),

    login: build.mutation<CurrentUser, LoginRequest>({
      query: (body) => ({ url: 'auth/login', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: user } = await queryFulfilled
          // The antiforgery token belonged to the anonymous identity.
          clearCsrfToken()
          void dispatch(authApi.util.upsertQueryData('getCurrentUser', undefined, user))
        } catch {
          // The failure is handled by the caller through unwrap(); nothing to update here.
        }
      },
    }),

    register: build.mutation<CurrentUser, RegisterRequest>({
      query: (body) => ({ url: 'auth/register', method: 'POST', body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data: user } = await queryFulfilled
          clearCsrfToken()
          void dispatch(authApi.util.upsertQueryData('getCurrentUser', undefined, user))
        } catch {
          // The failure is handled by the caller through unwrap(); nothing to update here.
        }
      },
    }),

    /** Prefer `useSignOut`, which also navigates away and clears cached private data. */
    logout: build.mutation<void, void>({
      query: () => ({ url: 'auth/logout', method: 'POST' }),
    }),

    forgotPassword: build.mutation<void, ForgotPasswordRequest>({
      query: (body) => ({ url: 'auth/forgot-password', method: 'POST', body }),
    }),

    resetPassword: build.mutation<void, ResetPasswordRequest>({
      query: (body) => ({ url: 'auth/reset-password', method: 'POST', body }),
    }),
  }),
})

export const {
  useGetCurrentUserQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi

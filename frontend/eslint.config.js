// @ts-check
import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y-x'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // Type-aware rules catch floating promises, unsafe `any` flows, etc.
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite(),
      jsxA11y.configs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // RTK Query documents `build.query<Result, void>` for endpoints without arguments,
    // which lets callers write `useGetBrandsQuery()` instead of `useGetBrandsQuery(undefined)`.
    files: ['src/features/**/*Api.ts'],
    rules: { '@typescript-eslint/no-invalid-void-type': 'off' },
  },
  {
    // shadcn/ui components co-export their `cva` variants (e.g. buttonVariants) by design.
    // The only cost is a full reload instead of fast refresh when editing these files.
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  // Must stay last: disables stylistic rules that would fight Prettier.
  prettierConfig,
])

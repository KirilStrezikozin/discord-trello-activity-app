// https://nextjs.org/docs/app/api-reference/config/eslint#migrating-existing-config
import { FlatCompat } from '@eslint/eslintrc'
import tseslintParser from '@typescript-eslint/parser'
import tseslintPlugin from '@typescript-eslint/eslint-plugin'
import importZodPlugin from 'eslint-plugin-import-zod'

const compat = new FlatCompat({
  // import.meta.dirname is available after Node.js v20.11.0
  baseDirectory: import.meta.dirname,
})

const eslintConfig = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
      'import-zod': importZodPlugin,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      'import-zod/prefer-zod-namespace': 'error',
    },
  },

  ...compat.config({
    extends: [
        'plugin:@next/next/recommended',
        'next/core-web-vitals',
        'next/typescript',
        'next',
        'prettier'
    ],
  }),
]

export default eslintConfig

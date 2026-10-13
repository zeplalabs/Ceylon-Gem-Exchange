import { FlatCompat } from '@eslint/eslintrc'
import { baseConfig } from './base.js'

const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

// Next.js's own rules (react-hooks, core-web-vitals, next/no-img-element,
// etc.) still ship as legacy-format configs, so FlatCompat bridges them
// into this monorepo's flat-config baseConfig — same two-piece pattern
// react-native.js uses (shared TS/base rules + platform-specific rules
// layered on top), just via Next's own preset instead of hand-picked
// react/react-hooks plugin configs.
/** @type {import('eslint').Linter.Config[]} */
export const nextConfig = [
  ...baseConfig,
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

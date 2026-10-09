import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Node-context config files (babel.config.js, metro.config.js, etc.)
    // and Expo config plugins (apps/mobile/plugins/withXxx.js) — the latter
    // run under Node during `expo prebuild`, never bundled by Metro, same
    // as the former, just following the Expo community's `withXxx` naming
    // convention instead of `*.config.js`.
    files: ['**/*.config.js', '**/*.config.cjs', '**/plugins/**/*.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    rules: {
      // These files are CommonJS by necessity (loaded via Node's require(),
      // not bundled/transpiled — Expo config plugins run during `expo
      // prebuild`, before Babel/TS ever enter the picture), so the
      // ESM-only-imports rule doesn't apply here.
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  prettier,
)

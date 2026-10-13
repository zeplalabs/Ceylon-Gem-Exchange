import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // packages/i18n and packages/ui-tokens are untranspiled TS source (no
  // build step — the same packages apps/mobile consumes directly via
  // Metro, which transpiles everything regardless). Next's default
  // pipeline only transpiles the app itself, not workspace dependencies,
  // so these need an explicit opt-in or the build fails importing raw .ts
  // files from node_modules.
  transpilePackages: ['@ceylon-gems/i18n', '@ceylon-gems/ui-tokens'],
}

export default nextConfig

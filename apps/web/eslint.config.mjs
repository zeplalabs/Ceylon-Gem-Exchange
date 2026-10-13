import { nextConfig } from '@ceylon-gems/config/eslint/next.js'

// next-env.d.ts is Next's own auto-generated, do-not-edit file — its
// triple-slash reference to .next/types/routes.d.ts trips
// next/typescript's own triple-slash-reference rule otherwise, a known
// gotcha in every Next.js project that uses this preset.
const config = [{ ignores: ['.next/**', 'next-env.d.ts'] }, ...nextConfig]

export default config

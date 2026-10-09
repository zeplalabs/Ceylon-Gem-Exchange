import { Platform } from 'react-native'

// The Android emulator can't resolve "localhost" as the host machine (it's
// the emulator's own loopback, not the Mac/PC running it) — it needs this
// special alias instead. Only rewrites when the configured URL is actually
// localhost/127.0.0.1, so a real LAN IP or tunnel URL (what a physical
// device — Android or iOS — needs in apps/mobile/.env) passes through
// unchanged. See .env.example's host-reachability note for the full
// iOS-simulator/Android-emulator/physical-device breakdown.
const ANDROID_EMULATOR_HOST = '10.0.2.2'
const LOCALHOST_PATTERN = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/

function resolveApiUrl(configured: string | undefined): string {
  if (!configured) return ''
  if (Platform.OS !== 'android') return configured
  return configured.replace(LOCALHOST_PATTERN, `$1${ANDROID_EMULATOR_HOST}$3`)
}

/** Base URL for the NestJS API — resolved once per platform, see above. */
export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL)

import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import {
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
  Jost_800ExtraBold,
} from '@expo-google-fonts/jost'
import {
  NotoSansSinhala_400Regular,
  NotoSansSinhala_500Medium,
  NotoSansSinhala_600SemiBold,
  NotoSansSinhala_700Bold,
  NotoSansSinhala_800ExtraBold,
} from '@expo-google-fonts/noto-sans-sinhala'
import {
  NotoSansTamil_400Regular,
  NotoSansTamil_500Medium,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
  NotoSansTamil_800ExtraBold,
} from '@expo-google-fonts/noto-sans-tamil'
import { gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { LogBox } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFontFamily } from '../hooks/useFontFamily'
import { useSyncDeviceLocale } from '../hooks/useSyncDeviceLocale'
import { useTranslation } from '../hooks/useTranslation'
import { CurrencyProvider } from '../providers/CurrencyProvider'
import { GemToneProvider, useGemTone } from '../providers/GemToneProvider'
import { LiveGradientProvider } from '../providers/LiveGradientProvider'
import { LocaleProvider } from '../providers/LocaleProvider'
import { NotificationsProvider } from '../providers/NotificationsProvider'

SplashScreen.preventAutoHideAsync()

// A known, harmless upstream warning from `expo-image`'s `transition`
// prop (used on Home's hero image) — it drives its crossfade through RN's
// legacy `Animated` JS-bridge listener mechanism, which logs this exact
// message when a fade is still in flight as the view unmounts/remounts
// (e.g. a quick nav away from Home before the 200ms fade finishes). Not
// our own code: grepping the app for `Animated` turns up only
// `react-native-reanimated`'s own `Animated` (Button/Toggle/PressableScale),
// which doesn't use this legacy listener path at all. Dev-console noise
// only — doesn't appear in production builds, doesn't affect the image or
// the fade itself.
LogBox.ignoreLogs(['Sending `onAnimatedValueUpdate` with no listeners registered'])

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

// Native stack (expo-router's default, backed by react-native-screens) —
// not a bare Slot — so a real screen like locale-settings gets an actual
// native header + back gesture, per the RN skill's navigation rules.
// Needs to live inside ClerkProvider (useAuth), LocaleProvider (useLocale),
// and GemToneProvider (useGemTone) subtrees.
function AppLayout() {
  useSyncDeviceLocale()
  const fonts = useFontFamily()
  const t = useTranslation()
  const { gemTone } = useGemTone()
  const tone = gemTones[gemTone]

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: tone.screen[1] },
        headerTintColor: neutral.white,
        headerTitleStyle: { fontFamily: fonts.semibold },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: tone.screen[1] },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="locale-settings"
        options={{ headerShown: true, title: t.localeSettings.title }}
      />
    </Stack>
  )
}

// The `expo-font` config plugin in app.json embeds these same files at
// native-build time (no loading flash, needed for a real release build) —
// but that ONLY takes effect in a custom dev client / EAS build, never in
// Expo Go, which is a fixed pre-built binary that can't pick up a config
// plugin's native project changes. Since this project is developed almost
// entirely through Expo Go, `useFontFamily`'s family names (`Jost_...`,
// `NotoSansSinhala_...`) were silently resolving to nothing there and every
// screen was falling back to the OS system font. This runtime `useFonts`
// call is what actually makes those names resolve in Expo Go; the config
// plugin stays for when this ships as a real build.
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
    Jost_800ExtraBold,
    NotoSansSinhala_400Regular,
    NotoSansSinhala_500Medium,
    NotoSansSinhala_600SemiBold,
    NotoSansSinhala_700Bold,
    NotoSansSinhala_800ExtraBold,
    NotoSansTamil_400Regular,
    NotoSansTamil_500Medium,
    NotoSansTamil_600SemiBold,
    NotoSansTamil_700Bold,
    NotoSansTamil_800ExtraBold,
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GemToneProvider>
        <LiveGradientProvider>
          <CurrencyProvider>
            <LocaleProvider>
              <NotificationsProvider>
                <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
                  <AppLayout />
                </ClerkProvider>
              </NotificationsProvider>
            </LocaleProvider>
          </CurrencyProvider>
        </LiveGradientProvider>
      </GemToneProvider>
    </GestureHandlerRootView>
  )
}

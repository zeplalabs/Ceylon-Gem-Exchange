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
import { defaultGemTone, gemTones, neutral } from '@ceylon-gems/ui-tokens'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useFontFamily } from '../hooks/useFontFamily'
import { useSyncDeviceLocale } from '../hooks/useSyncDeviceLocale'
import { useTranslation } from '../hooks/useTranslation'
import { LocaleProvider } from '../providers/LocaleProvider'

SplashScreen.preventAutoHideAsync()

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file')
}

const tone = gemTones[defaultGemTone]

// Native stack (expo-router's default, backed by react-native-screens) —
// not a bare Slot — so a real screen like locale-settings gets an actual
// native header + back gesture, per the RN skill's navigation rules.
// Needs to live inside both ClerkProvider (useAuth) and LocaleProvider
// (useLocale) subtrees.
function AppLayout() {
  useSyncDeviceLocale()
  const fonts = useFontFamily()
  const t = useTranslation()

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
      <LocaleProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <AppLayout />
        </ClerkProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  )
}

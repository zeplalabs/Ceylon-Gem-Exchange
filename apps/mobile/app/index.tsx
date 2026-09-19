import { Redirect } from 'expo-router'

// No real home screen exists yet — send the app straight into whatever the
// newest real screen is while they're being built one at a time. Update
// this redirect as later screens land; the component-kit gallery moved to
// /kitchen-sink so it's still reachable for testing components in
// isolation.
export default function Index() {
  return <Redirect href="/home" />
}

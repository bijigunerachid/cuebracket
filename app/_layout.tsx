import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DatabaseGate from '../src/DatabaseGate';
import { C, MotionProvider, useReducedMotion } from '../src/ui';
export const unstable_settings = { initialRouteName: '(tabs)' };
export default function Layout() {
  return (
    <MotionProvider>
      <Navigation />
    </MotionProvider>
  );
}
function Navigation() {
  const reducedMotion = useReducedMotion();
  return (
    <>
      <StatusBar style="light" />
      <DatabaseGate>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reducedMotion ? 'none' : 'slide_from_right',
            contentStyle: { backgroundColor: C.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="create"
            options={{ animation: reducedMotion ? 'none' : 'fade_from_bottom' }}
          />
          <Stack.Screen
            name="tournament/[id]/match/[matchId]"
            options={{ animation: reducedMotion ? 'none' : 'fade_from_bottom' }}
          />
          <Stack.Screen
            name="tournament/[id]/results"
            options={{ animation: reducedMotion ? 'none' : 'fade' }}
          />
        </Stack>
      </DatabaseGate>
    </>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DatabaseGate from '../src/DatabaseGate';
export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <DatabaseGate>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: '#07110F' },
          }}
        />
      </DatabaseGate>
    </>
  );
}

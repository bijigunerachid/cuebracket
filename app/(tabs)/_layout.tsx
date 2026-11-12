import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import TabIcon from '../../src/components/TabIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, theme, useFeedback, useReducedMotion } from '../../src/ui';

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reduced = useReducedMotion();
  const feedback = useFeedback();
  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        animation: reduced ? 'none' : 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: reduced ? 0 : theme.motion.selection },
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: C.green,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          height: 64 + insets.bottom + Math.max(0, fontScale - 1) * 24,
          paddingTop: 8,
          paddingBottom: insets.bottom + 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      {(
        [
          { name: 'index', title: 'Home' },
          { name: 'tournaments', title: 'Tournaments' },
          { name: 'players', title: 'Players' },
          { name: 'settings', title: 'Settings' },
        ] as const
      ).map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          listeners={({ navigation }) => ({
            tabPress: () => {
              if (!navigation.isFocused()) feedback('selection');
            },
          })}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color }) => <TabIcon name={tab.name} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}

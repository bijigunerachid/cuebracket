import { View } from 'react-native';
import AppIcon, { type IconName } from './AppIcon';
const names: Record<string, IconName> = {
  index: 'home',
  tournaments: 'award',
  players: 'users',
  settings: 'sliders',
};
export default function TabIcon({
  name,
  color,
}: {
  name: 'index' | 'tournaments' | 'players' | 'settings';
  color: string;
}) {
  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <AppIcon name={names[name]} color={color} size={22} />
    </View>
  );
}

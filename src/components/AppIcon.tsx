import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';
export type IconName = ComponentProps<typeof Feather>['name'];

// One bundled outline family, in 18 / 22 / 24 point sizes. Parent controls own labels.
export default function AppIcon({
  name,
  size = 22,
  color = '#F2F4F3',
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}

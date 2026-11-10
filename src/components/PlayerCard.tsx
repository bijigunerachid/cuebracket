import { Text, TouchableOpacity, View } from 'react-native';
import type { Player } from '../engine';
import { Avatar, C, styles } from '../ui';
export default function PlayerCard({
  player,
  detail,
  onActions,
}: {
  player: Player;
  detail?: string;
  onActions?: () => void;
}) {
  return (
    <View style={[styles.card, styles.row, { paddingVertical: 14 }]}>
      <Avatar name={player.name} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.text, { fontWeight: '600' }]}>{player.name}</Text>
        {detail ? <Text style={styles.muted}>{detail}</Text> : null}
      </View>
      {onActions ? (
        <TouchableOpacity
          onPress={onActions}
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${player.name}`}
          style={{ minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: C.muted, fontSize: 26 }}>···</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

import { Text, View } from 'react-native';
import type { Match, Player } from '../engine';
import { C, MotionPressable, styles } from '../ui';
import AppIcon from './AppIcon';

export default function MatchCard({
  match,
  players,
  onPress,
}: {
  match: Match;
  players: Player[];
  onPress?: () => void;
}) {
  const name = (id: number | null) =>
    id === null
      ? 'Awaiting player'
      : (players.find((player) => player.id === id)?.name ?? 'Unknown');
  const ready = !!onPress && match.status === 'pending' && match.p1 !== null && match.p2 !== null;
  const correcting = !!onPress && match.status === 'done';
  const actionable = ready || correcting;
  const bye = match.status === 'bye';
  return (
    <MotionPressable
      haptic="selection"
      disabled={!actionable}
      onPress={onPress}
      accessibilityRole={actionable ? 'button' : 'text'}
      accessibilityState={{ disabled: !actionable }}
      accessibilityHint={
        correcting ? 'Open to correct this result' : ready ? 'Open to record a result' : undefined
      }
      accessibilityLabel={
        bye
          ? `${name(match.winner)}, BYE, advances without playing or a score`
          : `${name(match.p1)} versus ${name(match.p2)}, ${match.status}${match.status === 'done' ? `, ${match.s1} to ${match.s2}, winner ${name(match.winner)}` : ''}`
      }
      style={[styles.card, { borderWidth: 0 }]}
    >
      <View style={[styles.row, { flexWrap: 'wrap', marginBottom: 10 }]}>
        <Text style={styles.muted}>
          R{match.round} · Match {match.slot + 1}
        </Text>
        <Text style={styles.muted}>
          {bye ? 'BYE' : match.status === 'done' ? 'Final' : ready ? 'Ready' : 'Pending'}
        </Text>
      </View>
      {[
        { id: match.p1, score: match.s1 },
        { id: match.p2, score: match.s2 },
      ]
        .filter((player) => !bye || player.id !== null)
        .map((player, index) => (
          <View key={index} style={[styles.row, { minHeight: 38 }]}>
            <Text
              style={[
                styles.text,
                {
                  flex: 1,
                  color:
                    player.id !== null && match.winner === player.id && !bye ? C.green : C.white,
                  fontWeight: '500',
                },
              ]}
            >
              {name(player.id)}
            </Text>
            {match.status === 'done' ? (
              <>
                <View style={{ width: 20 }}>
                  {match.winner === player.id ? (
                    <AppIcon name="check" size={16} color={C.green} />
                  ) : null}
                </View>
                <Text
                  style={{
                    minWidth: 36,
                    textAlign: 'right',
                    color: match.winner === player.id ? C.green : C.white,
                    fontSize: 24,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {player.score}
                </Text>
              </>
            ) : null}
          </View>
        ))}
      <View style={[styles.row, { marginTop: 10 }]}>
        <Text style={[styles.muted, { flex: 1 }]}>
          {bye
            ? 'Advances automatically · No score'
            : `${match.target != null ? `First to ${match.target}` : 'Awaiting opponents'}${correcting ? ' · Correct result' : ready ? ' · Enter result' : ''}`}
        </Text>
        {actionable ? <AppIcon name="chevron-right" size={18} color={C.muted} /> : null}
      </View>
    </MotionPressable>
  );
}

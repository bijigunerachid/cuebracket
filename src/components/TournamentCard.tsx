import { Text, View } from 'react-native';
import { formatLabel, type Tournament } from '../engine';
import { baseScoringRule } from '../rules';
import { createdDate, displayScoringLabel } from '../presentation';
import { C, MotionPressable, Progress, styles } from '../ui';
import AppIcon from './AppIcon';

export default function TournamentCard({
  tournament,
  onPress,
  progress,
}: {
  tournament: Tournament;
  onPress: () => void;
  progress?: { done: number; total: number };
}) {
  const status =
    tournament.status === 'active'
      ? 'In progress'
      : tournament.status === 'complete'
        ? 'Completed'
        : 'Setup';
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${tournament.name}, ${status}`}
      onPress={onPress}
      style={[
        styles.card,
        {
          borderWidth: 0,
          borderLeftWidth: tournament.status === 'active' ? 2 : 0,
          borderLeftColor: C.green,
        },
      ]}
    >
      <View style={styles.row}>
        <Text style={[styles.text, { flex: 1, fontWeight: '600', fontSize: 18 }]}>
          {tournament.name}
        </Text>
        <AppIcon name="chevron-right" size={18} color={C.muted} />
      </View>
      <Text style={[styles.muted, { marginTop: 5 }]}>
        {tournament.game === '8ball' ? '8-Ball Pool' : 'Snooker'} · {formatLabel(tournament.format)}
      </Text>
      <Text style={[styles.muted, { marginTop: 4 }]}>
        {displayScoringLabel(baseScoringRule(tournament), tournament.first_to_label)}
      </Text>
      <View style={[styles.row, { flexWrap: 'wrap', marginTop: 12 }]}>
        <Text style={{ color: tournament.status === 'active' ? C.green : C.muted, fontSize: 13 }}>
          {status}
        </Text>
        <Text style={styles.muted}>{createdDate(tournament.created_at) ?? ''}</Text>
      </View>
      {progress ? (
        <Progress
          value={progress.done}
          total={progress.total}
          label={`${progress.done} / ${progress.total} drawn matches played`}
        />
      ) : null}
    </MotionPressable>
  );
}

import { Text, TouchableOpacity, View } from 'react-native';
import { formatLabel, type Tournament } from '../engine';
import { baseScoringRule } from '../rules';
import { createdDate, displayScoringLabel } from '../presentation';
import { Avatar, C, Progress, StatusBadge, styles } from '../ui';

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
        : 'Registration';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open ${tournament.name}, ${status}`}
      onPress={onPress}
      style={styles.card}
    >
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <Avatar name={tournament.name} ball={tournament.game === '8ball'} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={[styles.text, { fontWeight: '700', fontSize: 18 }]}>{tournament.name}</Text>
          <Text style={styles.muted}>
            {tournament.game === '8ball' ? '8-Ball Pool' : 'Snooker'} ·{' '}
            {formatLabel(tournament.format)}
          </Text>
        </View>
        <Text style={{ color: C.green, fontSize: 24 }}>›</Text>
      </View>
      <View style={[styles.row, { flexWrap: 'wrap', marginTop: 18 }]}>
        <StatusBadge
          label={status}
          tone={
            tournament.status === 'complete'
              ? 'gold'
              : tournament.status === 'setup'
                ? 'muted'
                : 'green'
          }
        />
        <Text style={styles.muted}>
          {displayScoringLabel(baseScoringRule(tournament), tournament.first_to_label)}
        </Text>
      </View>
      {progress ? (
        <Progress
          value={progress.done}
          total={progress.total}
          label={`${progress.done} of ${progress.total} drawn matches played`}
        />
      ) : null}
      {createdDate(tournament.created_at) ? (
        <Text style={[styles.muted, { marginTop: 12 }]}>
          Created {createdDate(tournament.created_at)}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

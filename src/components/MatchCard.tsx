import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Match, Player } from '../engine';
import { C, styles } from '../ui';

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
      ? match.status === 'bye'
        ? 'BYE'
        : 'TBD'
      : (players.find((player) => player.id === id)?.name ?? 'Unknown');
  const ready = !!onPress && match.status === 'pending' && match.p1 !== null && match.p2 !== null;
  return (
    <TouchableOpacity
      disabled={!ready}
      onPress={onPress}
      accessibilityRole={ready ? 'button' : 'text'}
      accessibilityState={{ disabled: !ready }}
      accessibilityLabel={`${name(match.p1)} versus ${name(match.p2)}, ${match.status}${match.status === 'done' ? `, ${match.s1} to ${match.s2}` : ''}`}
      style={styles.card}
    >
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Text style={styles.muted}>
          Round {match.round} · Match {match.slot + 1}
        </Text>
        <Text style={{ color: match.status === 'done' ? C.green : C.muted }}>
          {match.status.toUpperCase()}
        </Text>
      </View>
      <View style={[styles.row, { marginTop: 10 }]}>
        <Text style={[styles.text, { flex: 1 }]}>{name(match.p1)}</Text>
        <Text style={{ color: C.green, fontWeight: '800' }}>
          {match.status === 'done'
            ? `${match.s1} – ${match.s2}`
            : match.status === 'bye'
              ? 'BYE'
              : 'VS'}
        </Text>
        <Text style={[styles.text, { flex: 1, textAlign: 'right' }]}>{name(match.p2)}</Text>
      </View>
      {ready ? <Text style={[styles.muted, { marginTop: 8 }]}>Tap to enter result</Text> : null}
    </TouchableOpacity>
  );
}

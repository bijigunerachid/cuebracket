import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Match, Player } from '../engine';
import { Avatar, C, StatusBadge, styles } from '../ui';

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
        : 'Awaiting player'
      : (players.find((player) => player.id === id)?.name ?? 'Unknown');
  const ready = !!onPress && match.status === 'pending' && match.p1 !== null && match.p2 !== null;
  const bye = match.status === 'bye';
  return (
    <TouchableOpacity
      disabled={!ready}
      onPress={onPress}
      accessibilityRole={ready ? 'button' : 'text'}
      accessibilityState={{ disabled: !ready }}
      accessibilityLabel={`${name(match.p1)} versus ${name(match.p2)}, ${match.status}${match.status === 'done' ? `, ${match.s1} to ${match.s2}, winner ${name(match.winner)}` : bye ? ', advances without playing' : ''}`}
      style={[styles.card, ready && { borderColor: '#365E47' }]}
    >
      <View style={[styles.row, { flexWrap: 'wrap', marginBottom: 16 }]}>
        <Text style={styles.muted}>
          R{match.round} · Match {match.slot + 1}
        </Text>
        <StatusBadge
          label={
            bye
              ? 'Automatic advance'
              : match.status === 'done'
                ? 'Final result'
                : ready
                  ? 'Ready to play'
                  : 'Awaiting opponents'
          }
          tone={bye ? 'muted' : match.status === 'done' ? 'gold' : 'green'}
        />
      </View>
      {[
        { id: match.p1, score: match.s1 },
        { id: match.p2, score: match.s2 },
      ]
        .filter((player) => !bye || player.id !== null)
        .map((player, index) => (
          <View key={index} style={[styles.row, { marginTop: index ? 12 : 0 }]}>
            <Avatar name={name(player.id)} />
            <Text
              style={[
                styles.text,
                {
                  flex: 1,
                  fontWeight: match.winner === player.id && player.id !== null ? '700' : '500',
                  color: match.winner === player.id && player.id !== null ? C.green : C.white,
                },
              ]}
            >
              {name(player.id)}
            </Text>
            {match.status === 'done' ? (
              <Text
                style={{
                  color: match.winner === player.id ? C.green : C.muted,
                  fontSize: 26,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {player.score}
              </Text>
            ) : null}
            {match.winner === player.id && player.id !== null && !bye ? (
              <Text accessibilityLabel="Winner" style={{ color: C.green }}>
                ✓
              </Text>
            ) : null}
          </View>
        ))}
      <Text style={[styles.muted, { marginTop: 16 }]}>
        {bye
          ? 'BYE · No match played. No score recorded.'
          : `${match.target != null ? `First to ${match.target} · ` : ''}${ready ? 'Enter result  →' : match.status === 'done' ? 'Score confirmed' : 'Waiting for the draw'}`}
      </Text>
    </TouchableOpacity>
  );
}

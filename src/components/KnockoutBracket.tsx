import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { buildKnockoutLayout } from '../bracket';
import type { Match, Player } from '../engine';
import { C, Card, styles } from '../ui';

type Props = { matches: Match[]; players: Player[]; onScore?: (match: Match) => void };

export default function KnockoutBracket({ matches, players, onScore }: Props) {
  const { fontScale } = useWindowDimensions();
  const layout = useMemo(() => {
    try {
      return buildKnockoutLayout(matches, {
        cardWidth: Math.ceil(260 * Math.max(1, Math.min(fontScale, 1.5))),
        cardHeight: Math.ceil(192 * Math.max(1, fontScale)),
        columnGap: 48,
        rowGap: 24,
      });
    } catch {
      return null;
    }
  }, [matches, fontScale]);
  const names = new Map(players.map((player) => [player.id, player.name]));
  const byId = new Map(matches.map((match) => [match.id, match]));
  if (!layout)
    return (
      <Card>
        <Text style={styles.muted}>
          This bracket cannot be drawn. Switch to Round List to inspect the saved matches.
        </Text>
      </Card>
    );
  if (!layout.nodes.length)
    return (
      <Card>
        <Text style={styles.muted}>Confirm a draw to see the bracket.</Text>
      </Card>
    );

  return (
    <>
      <Text style={[styles.muted, { marginVertical: 12 }]}>
        Swipe for later rounds. Tap a ready match to score, or a played match to correct its result.
      </Text>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator
        accessibilityLabel="Knockout bracket, scroll horizontally for later rounds"
      >
        <View>
          <View style={{ width: layout.width, height: Math.ceil(48 * Math.max(1, fontScale)) }}>
            {layout.rounds.map((round) => (
              <Text
                key={round.round}
                accessibilityRole="header"
                style={[
                  styles.label,
                  { position: 'absolute', left: round.x, width: round.width, color: C.muted },
                ]}
              >
                {round.round === 1 &&
                matches.some((match) => match.round === 1 && match.status === 'bye')
                  ? 'Opening round'
                  : round.label}
              </Text>
            ))}
          </View>
          <View style={{ width: layout.width, height: layout.height }}>
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: layout.width,
                height: layout.height,
              }}
            >
              {layout.edges.flatMap((edge) =>
                edge.lines.map((line, index) => (
                  <View
                    key={`${edge.from}-${index}`}
                    style={{
                      position: 'absolute',
                      left: line.x,
                      top: line.y,
                      width: line.width,
                      height: line.height,
                      backgroundColor: byId.get(edge.from)?.winner != null ? C.green : C.border,
                    }}
                  />
                )),
              )}
            </View>
            {layout.nodes.map((node) => {
              const match = node.match;
              const ready =
                !!onScore && match.status === 'pending' && match.p1 !== null && match.p2 !== null;
              const correcting = !!onScore && match.status === 'done';
              const actionable = ready || correcting;
              const name = (id: number | null) =>
                id === null
                  ? match.status === 'bye'
                    ? 'BYE'
                    : 'TBD'
                  : (names.get(id) ?? 'Unknown');
              const winner = match.winner === null ? null : (names.get(match.winner) ?? 'Unknown');
              const label = `Round ${match.round}, match ${match.slot + 1}: ${name(match.p1)} versus ${name(match.p2)}, ${match.status}${match.status === 'done' ? `, score ${match.s1} to ${match.s2}` : ''}${winner ? `, winner ${winner}` : ''}${ready ? ', tap to enter score' : ''}`;
              return (
                <TouchableOpacity
                  key={match.id}
                  disabled={!actionable}
                  onPress={() => onScore?.(match)}
                  accessible
                  accessibilityRole={actionable ? 'button' : 'text'}
                  accessibilityLabel={label}
                  accessibilityState={{ disabled: !actionable }}
                  accessibilityHint={correcting ? 'Open to correct this result' : undefined}
                  style={[
                    styles.card,
                    {
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: node.width,
                      height: node.height,
                      marginBottom: 0,
                      padding: 12,
                      justifyContent: 'space-between',
                      borderColor: C.border,
                    },
                  ]}
                >
                  <Text style={styles.muted} numberOfLines={1}>
                    Match {match.slot + 1} · {match.status.toUpperCase()}
                  </Text>
                  {[
                    { id: match.p1, score: match.s1 },
                    { id: match.p2, score: match.s2 },
                  ].map((player, index) => (
                    <View key={index} style={[styles.row, { minHeight: 44 }]}>
                      <Text
                        numberOfLines={2}
                        style={[
                          styles.text,
                          {
                            flex: 1,
                            color:
                              player.id !== null &&
                              match.winner === player.id &&
                              match.status === 'done'
                                ? C.green
                                : C.white,
                            fontWeight:
                              player.id !== null &&
                              match.winner === player.id &&
                              match.status === 'done'
                                ? '700'
                                : '400',
                          },
                        ]}
                      >
                        {name(player.id)}
                      </Text>
                      {match.status === 'done' ? (
                        <Text
                          style={{
                            color: match.winner === player.id ? C.green : C.muted,
                            fontWeight: '600',
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {player.score}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                  <Text style={styles.muted} numberOfLines={1}>
                    {ready
                      ? `First to ${match.target ?? '?'} - tap to score`
                      : match.status === 'bye'
                        ? 'Advanced automatically'
                        : match.status === 'done'
                          ? correcting
                            ? 'Tap to correct result'
                            : 'Final result'
                          : 'Waiting for opponents'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

import { displayScoringLabel } from '../presentation';
import React, { useCallback, useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import type { Match, Player, Tournament } from '../engine';
import { ruleForMatch, scoringTarget, validateTargetScore } from '../rules';
import { Btn, Card, Page, ResponsiveRow, ScoreDisplay, StatusBadge, styles } from '../ui';

export default function MatchScoreScreen({
  tournament,
  match,
  players,
  onSave,
  onCancel,
}: {
  tournament: Tournament;
  match: Match;
  players: Player[];
  onSave: (first: number, second: number) => void;
  onCancel: () => void;
}) {
  const correcting = match.status === 'done';
  const [first, setFirst] = useState(match.s1 ?? 0);
  const [second, setSecond] = useState(match.s2 ?? 0);
  const [nameHeight, setNameHeight] = useState(0);
  const { width, fontScale } = useWindowDimensions();
  useEffect(() => setNameHeight(0), [width, fontScale]);
  const measureName = useCallback(
    (height: number) => setNameHeight((current) => Math.max(current, height)),
    [],
  );
  const rule = ruleForMatch(tournament, match);
  const target = match.target ?? scoringTarget(rule);
  const valid = validateTargetScore(first, second, target);
  const winner = players.find((player) => player.id === (first > second ? match.p1 : match.p2));
  return (
    <Page
      title={correcting ? 'Correct result' : 'Record result'}
      subtitle={`${tournament.name} · Round ${match.round} · Match ${match.slot + 1}`}
      onBack={onCancel}
      footer={
        <Btn
          title={correcting ? 'Review correction' : 'Review & confirm result'}
          disabled={!valid || (correcting && first === match.s1 && second === match.s2)}
          onPress={() => onSave(first, second)}
        />
      }
    >
      {correcting ? (
        <Text style={[styles.muted, { marginBottom: 16 }]}>
          Saved score: {match.s1}–{match.s2}. Winner changes are blocked if they affect a later
          match with a confirmed result. Existing draws stay in place.
        </Text>
      ) : null}
      <View style={{ marginBottom: 24 }}>
        <StatusBadge label={displayScoringLabel(rule, tournament.first_to_label)} />
        <Text style={[styles.muted, { marginTop: 6 }]}>
          Final {tournament.game === 'snooker' ? 'frames' : 'racks'} won
        </Text>
      </View>
      <ResponsiveRow>
        {[
          { id: match.p1, score: first, set: setFirst, other: second },
          { id: match.p2, score: second, set: setSecond, other: first },
        ].map((player) => {
          const name = players.find((entry) => entry.id === player.id)?.name ?? 'Unknown';
          return (
            <View key={player.id} style={{ flex: 1, minWidth: 0 }}>
              <Card>
                <ScoreDisplay
                  name={name}
                  score={player.score}
                  winner={player.score === target && player.other < target}
                  nameHeight={nameHeight}
                  onNameLayout={measureName}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Btn
                      title="Decrease"
                      icon="minus"
                      iconOnly
                      accessibilityLabel={`Decrease ${name}`}
                      secondary
                      disabled={player.score === 0}
                      onPress={() => player.set((current) => Math.max(0, current - 1))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn
                      title="Increase"
                      icon="plus"
                      iconOnly
                      accessibilityLabel={`Increase ${name}`}
                      secondary
                      disabled={player.score === target}
                      onPress={() => player.set((current) => Math.min(target, current + 1))}
                    />
                  </View>
                </View>
              </Card>
            </View>
          );
        })}
      </ResponsiveRow>
      <Text style={styles.muted} accessibilityLiveRegion="polite">
        {valid
          ? `${winner?.name ?? 'Winner'} wins ${Math.max(first, second)}–${Math.min(first, second)}. Review before saving.`
          : first === target && second === target
            ? 'Both players cannot reach the winning target. Adjust one score.'
            : `The winner needs ${target}; the opponent must finish below ${target}.`}
      </Text>
    </Page>
  );
}

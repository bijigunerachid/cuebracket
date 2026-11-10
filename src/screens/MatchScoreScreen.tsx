import { displayScoringLabel } from '../presentation';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
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
  const [first, setFirst] = useState(0);
  const [second, setSecond] = useState(0);
  const rule = ruleForMatch(tournament, match);
  const target = match.target ?? scoringTarget(rule);
  const valid = validateTargetScore(first, second, target);
  const winner = players.find((player) => player.id === (first > second ? match.p1 : match.p2));
  return (
    <Page
      title="Every frame counts."
      subtitle={`${tournament.name} · Round ${match.round} · Match ${match.slot + 1}`}
      onBack={onCancel}
      footer={
        <Btn
          title="Review & confirm result"
          disabled={!valid}
          onPress={() => onSave(first, second)}
        />
      }
    >
      <Card highlight>
        <StatusBadge label={displayScoringLabel(rule, tournament.first_to_label)} />
        <Text style={[styles.muted, { marginTop: 12 }]}>
          Record the final {tournament.game === 'snooker' ? 'frames' : 'racks'} won. First to{' '}
          {target} wins this match.
        </Text>
      </Card>
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
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Btn
                      title="−"
                      accessibilityLabel={`Decrease ${name}`}
                      secondary
                      disabled={player.score === 0}
                      onPress={() => player.set((current) => Math.max(0, current - 1))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn
                      title="+"
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
      <Text style={[styles.muted, { textAlign: 'center', marginTop: 16 }]}>
        You’ll confirm once more before saving. Confirmed scores are locked.
      </Text>
    </Page>
  );
}

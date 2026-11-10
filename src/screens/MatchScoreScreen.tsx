import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { Match, Player, Tournament } from '../engine';
import { ruleForMatch, scoringTarget, scoringLabel, validateTargetScore } from '../rules';
import { Btn, C, Card, Page, styles } from '../ui';

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
  return (
    <Page
      title="Match Score"
      subtitle={`Round ${match.round} - ${scoringLabel(rule, tournament.first_to_label)}`}
      onBack={onCancel}
    >
      <Card>
        <View style={{ gap: 24 }}>
          {[
            { id: match.p1, score: first, set: setFirst },
            { id: match.p2, score: second, set: setSecond },
          ].map((player) => {
            const name = players.find((entry) => entry.id === player.id)?.name ?? 'Unknown';
            return (
              <View key={player.id}>
                <Text style={styles.text}>{name}</Text>
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: C.green, fontSize: 48, fontWeight: '800' }}
                >
                  {player.score}
                </Text>
                <View style={[styles.row, { flexWrap: 'wrap', justifyContent: 'flex-start' }]}>
                  <Btn
                    title={`Decrease ${name}`}
                    secondary
                    disabled={player.score === 0}
                    onPress={() => player.set((current) => Math.max(0, current - 1))}
                  />
                  <Btn
                    title={`Increase ${name}`}
                    secondary
                    disabled={player.score === target}
                    onPress={() => player.set((current) => Math.min(target, current + 1))}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </Card>
      <Text style={styles.muted}>
        Enter the final racks/frames won. The winner must reach {target}.
      </Text>
      <Btn
        title="Confirm Result"
        disabled={!validateTargetScore(first, second, target)}
        onPress={() => onSave(first, second)}
      />
      <Btn title="Cancel" secondary onPress={onCancel} />
    </Page>
  );
}

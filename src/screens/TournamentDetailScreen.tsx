import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { TournamentData } from '../components/TournamentRoute';
import MatchCard from '../components/MatchCard';
import KnockoutBracket from '../components/KnockoutBracket';
import type { Match } from '../engine';
import { baseScoringRule, scoringLabel } from '../rules';
import { Btn, C, Card, Choice, Page, styles } from '../ui';

type Props = TournamentData & {
  onEdit: () => void;
  onPlayers: () => void;
  onDraw: () => void;
  onResults: () => void;
  onScore: (match: Match) => void;
  onDelete: () => void;
  onHome: () => void;
};

export default function TournamentDetailScreen({
  tournament,
  players,
  matches,
  standings,
  onEdit,
  onPlayers,
  onDraw,
  onResults,
  onScore,
  onDelete,
  onHome,
}: Props) {
  const [view, setView] = useState<'bracket' | 'rounds'>('bracket');
  return (
    <Page
      title={tournament.name}
      subtitle={`${tournament.game === '8ball' ? '8-Ball Pool' : 'Snooker'} · ${tournament.format === 'knockout' ? 'Knockout' : 'Round robin'} · ${scoringLabel(baseScoringRule(tournament), tournament.first_to_label)}`}
      onBack={onHome}
    >
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Text
          style={{ color: tournament.status === 'complete' ? C.gold : C.green, fontWeight: '800' }}
        >
          {tournament.status.toUpperCase()}
        </Text>
        <Text style={styles.muted}>{players.length} players</Text>
      </View>
      {tournament.format === 'knockout' &&
      matches.some((match) => match.round === 1 && match.p1 === null && match.p2 === null) ? (
        <Card>
          <Text style={styles.text}>
            This event has an incomplete draw from an older version. Recorded results are preserved.
            Create a new tournament to use the corrected draw.
          </Text>
        </Card>
      ) : null}
      {tournament.status === 'setup' ? (
        <>
          <Btn title="Edit Tournament" onPress={onEdit} />
          <Btn title="Manage Players" onPress={onPlayers} />
          <Btn title="Generate Draw" disabled={players.length < 2} onPress={onDraw} />
        </>
      ) : (
        <>
          {tournament.status === 'complete' ? (
            <Btn title="View Results" onPress={onResults} />
          ) : null}
          {tournament.format === 'round_robin' ? (
            <>
              <Text style={styles.label}>STANDINGS</Text>
              {standings.map((row, index) => (
                <Card key={row.player.id}>
                  <Text style={styles.text}>
                    {index + 1}. {row.player.name}
                  </Text>
                  <Text style={styles.muted}>
                    {row.wins}W · {row.played}P · {row.diff > 0 ? '+' : ''}
                    {row.diff}
                  </Text>
                </Card>
              ))}
            </>
          ) : null}
          <Text style={styles.label}>MATCHES / ROUNDS</Text>
          {tournament.format === 'knockout' ? (
            <Choice
              value={view}
              onChange={setView}
              options={[
                { label: 'Connected Bracket', value: 'bracket' },
                { label: 'Round List', value: 'rounds' },
              ]}
            />
          ) : null}
          {tournament.format === 'knockout' && view === 'bracket' ? (
            <KnockoutBracket
              matches={matches}
              players={players}
              onScore={tournament.status === 'active' ? onScore : undefined}
            />
          ) : (
            [...new Set(matches.map((match) => match.round))].map((round) => (
              <View key={round}>
                <Text style={[styles.label, { color: C.green }]}>ROUND {round}</Text>
                {matches
                  .filter((match) => match.round === round)
                  .map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      players={players}
                      onPress={tournament.status === 'active' ? () => onScore(match) : undefined}
                    />
                  ))}
              </View>
            ))
          )}
        </>
      )}
      <Btn title="All Tournaments" secondary onPress={onHome} />
      <Btn title="Delete Tournament" secondary onPress={onDelete} />
    </Page>
  );
}

import React from 'react';
import { Text } from 'react-native';
import type { TournamentData } from '../components/TournamentRoute';
import { tiedLeaders } from '../engine';
import { Btn, C, Card, Page, Reveal, SectionHeading, StatusBadge, styles } from '../ui';

export default function TournamentResultsScreen({
  tournament,
  players,
  matches,
  standings,
  onMatches,
  onHome,
}: TournamentData & { onMatches: () => void; onHome: () => void }) {
  const final = matches.find(
    (match) =>
      match.round === Math.max(...matches.map((row) => row.round)) && match.winner !== null,
  );
  const leaders = tiedLeaders(standings);
  const unresolved = tournament.format === 'round_robin' && leaders.length > 1;
  const champion =
    tournament.format !== 'round_robin'
      ? (players.find((player) => player.id === final?.winner)?.name ?? 'TBD')
      : leaders.map((row) => row.player.name).join(' / ') || 'TBD';
  return (
    <Page title="Tournament Results" subtitle={tournament.name} onBack={onMatches}>
      <Reveal change={tournament.id} kind="champion">
        <Card highlight>
          <StatusBadge label="COMPETITION COMPLETE" tone="gold" />
          <Text style={{ color: C.gold, fontSize: 18, textAlign: 'center' }}>
            {unresolved ? 'TIED LEADERS - TIEBREAK REQUIRED' : 'CHAMPION'}
          </Text>
          <Text
            style={{
              color: C.white,
              fontSize: 32,
              fontWeight: '900',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            {champion}
          </Text>
          <Text style={[styles.muted, { textAlign: 'center', marginTop: 20 }]}>
            {players.length} players · {matches.filter((match) => match.status === 'done').length}{' '}
            matches played
          </Text>
        </Card>
      </Reveal>
      {tournament.format === 'round_robin' ? (
        <>
          <SectionHeading title="Final standings" />
          {standings.map((row, index) => (
            <Card key={row.player.id}>
              <Text style={styles.text}>
                {index + 1}. {row.player.name} — {row.wins} wins, diff {row.diff}
              </Text>
            </Card>
          ))}
          <Text style={styles.muted}>
            Ties are displayed alphabetically after wins and difference. Tied leaders remain
            unresolved; no tiebreak match is automated.
          </Text>
        </>
      ) : null}
      <Btn title="View Matches" onPress={onMatches} />
      <Btn title="All Tournaments" secondary onPress={onHome} />
    </Page>
  );
}

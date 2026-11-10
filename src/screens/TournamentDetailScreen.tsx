import { displayScoringLabel } from '../presentation';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { TournamentData } from '../components/TournamentRoute';
import MatchCard from '../components/MatchCard';
import KnockoutBracket from '../components/KnockoutBracket';
import PlayerCard from '../components/PlayerCard';
import { formatLabel, type Match } from '../engine';
import { baseScoringRule } from '../rules';
import {
  BottomSheet,
  Btn,
  C,
  Card,
  Choice,
  Page,
  Progress,
  Reveal,
  SectionHeading,
  StatusBadge,
  styles,
} from '../ui';

type Props = TournamentData & {
  onEdit: () => void;
  onPlayers: () => void;
  onDraw: () => void;
  onResults: () => void;
  onScore: (match: Match) => void;
  onDelete: () => void;
  onHome: () => void;
  onBack: () => void;
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
  onBack,
}: Props) {
  const [view, setView] = useState<'bracket' | 'rounds' | 'players' | 'standings'>('rounds');
  const [actions, setActions] = useState(false);
  const [roundFilter, setRoundFilter] = useState('current');
  const ready = matches.filter(
    (match) => match.status === 'pending' && match.p1 !== null && match.p2 !== null,
  );
  const rounds = [...new Set(matches.map((match) => match.round))];
  const currentRound = ready.length
    ? Math.min(...ready.map((match) => match.round))
    : Math.max(1, ...rounds);
  const played = matches.filter((match) => match.status === 'done').length;
  const playable = matches.filter((match) => match.status !== 'bye').length;
  return (
    <Page
      title={tournament.name}
      subtitle={`${tournament.game === '8ball' ? '8-Ball Pool' : 'Snooker'} · ${formatLabel(tournament.format)} · ${displayScoringLabel(baseScoringRule(tournament), tournament.first_to_label)}`}
      onBack={onBack}
    >
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <StatusBadge
          label={
            tournament.status === 'complete'
              ? 'Completed'
              : tournament.status === 'active'
                ? 'In progress'
                : 'Registration open'
          }
          tone={tournament.status === 'complete' ? 'gold' : 'green'}
        />
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
          <SectionHeading title="Tournament setup" />
          <Card>
            <Text style={styles.heading}>
              Next up: {players.length < 2 ? 'the players' : 'the draw'}
            </Text>
            <Text style={styles.muted}>
              Register at least two players, then review your pairings. Nothing starts until you
              confirm.
            </Text>
            <Btn title="Manage players" onPress={onPlayers} />
            <Btn title="Generate Draw" disabled={players.length < 2} onPress={onDraw} />
            <Btn title="Edit tournament settings" secondary onPress={onEdit} />
          </Card>
        </>
      ) : (
        <>
          <Reveal change={`${currentRound}-${tournament.status}`}>
            <Card highlight>
              <StatusBadge
                label={
                  tournament.status === 'complete' ? 'Completed' : `ROUND ${currentRound} · IN PLAY`
                }
              />
              <Text style={[styles.heading, { marginTop: 8 }]}>
                {tournament.status === 'complete'
                  ? 'Tournament complete'
                  : `${ready.length} ${ready.length === 1 ? 'match' : 'matches'} ready for a result`}
              </Text>
              <Progress
                value={played}
                total={playable}
                label={`${played} of ${playable} drawn matches played`}
              />
              {ready[0] ? (
                <Btn title="Enter next result" onPress={() => onScore(ready[0])} />
              ) : null}
              {tournament.status === 'complete' ? (
                <Btn title="View Results" onPress={onResults} />
              ) : null}
            </Card>
          </Reveal>
          <Choice
            value={view}
            onChange={setView}
            options={[
              { label: 'Matches', value: 'rounds' },
              { label: 'Players', value: 'players' },
              ...(tournament.format === 'knockout'
                ? [{ label: 'Bracket', value: 'bracket' as const }]
                : []),
              ...(tournament.format === 'round_robin'
                ? [{ label: 'Standings', value: 'standings' as const }]
                : []),
            ]}
          />
          {view === 'players' ? (
            <>
              <SectionHeading title="Tournament roster" detail={`${players.length} players`} />
              {players.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </>
          ) : null}
          {tournament.format === 'round_robin' && view === 'standings' ? (
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
          {tournament.format === 'dynamic_knockout' && view === 'rounds' ? (
            <Card>
              <Text style={styles.muted}>
                Dynamic Knockout: qualifiers are reshuffled only after every match in the current
                round is confirmed. Each odd-player round has one automatic BYE. Future rounds
                appear when drawn.
              </Text>
            </Card>
          ) : null}
          {view === 'rounds' ? (
            <>
              <SectionHeading title="At the table" />
              <Choice
                value={roundFilter}
                onChange={setRoundFilter}
                options={[
                  { label: 'Current round', value: 'current' },
                  { label: 'All rounds', value: 'all' },
                  ...rounds.map((round) => ({ label: `R${round}`, value: String(round) })),
                ]}
              />
            </>
          ) : null}
          {tournament.format === 'knockout' && view === 'bracket' ? (
            <KnockoutBracket
              matches={matches}
              players={players}
              onScore={tournament.status === 'active' ? onScore : undefined}
            />
          ) : view === 'rounds' ? (
            rounds
              .filter(
                (round) =>
                  roundFilter === 'all' ||
                  round === (roundFilter === 'current' ? currentRound : Number(roundFilter)),
              )
              .map((round) => (
                <View key={round}>
                  <Text style={[styles.label, { color: C.green }]}>ROUND {round}</Text>
                  {tournament.format === 'dynamic_knockout' ? (
                    <Text style={[styles.muted, { marginBottom: 10 }]}>
                      {
                        matches.filter((match) => match.round === round && match.status !== 'bye')
                          .length
                      }{' '}
                      matches ·{' '}
                      {
                        matches.filter((match) => match.round === round && match.status === 'bye')
                          .length
                      }{' '}
                      BYEs ·{' '}
                      {
                        matches.filter(
                          (match) => match.round === round && match.status === 'pending',
                        ).length
                      }{' '}
                      awaiting results
                    </Text>
                  ) : null}
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
          ) : null}
        </>
      )}
      <Btn
        title="Tournament actions"
        icon="more-horizontal"
        secondary
        onPress={() => setActions(true)}
      />
      <BottomSheet visible={actions} title="Tournament actions" onClose={() => setActions(false)}>
        <Btn
          title="All tournaments"
          secondary
          onPress={() => {
            setActions(false);
            onHome();
          }}
        />
        <Btn
          title="Delete tournament"
          secondary
          danger
          onPress={() => {
            setActions(false);
            onDelete();
          }}
        />
      </BottomSheet>
    </Page>
  );
}

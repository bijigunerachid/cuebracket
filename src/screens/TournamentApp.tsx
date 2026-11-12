import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as store from '../db';
import type { Match, Player, Tournament } from '../engine';
import { tournamentPath } from '../navigation';
import TournamentCard from '../components/TournamentCard';
import MatchCard from '../components/MatchCard';
import { Btn, Choice, EmptyState, Field, Page, SectionHeading, styles } from '../ui';

type EventData = { tournament: Tournament; matches: Match[]; players: Player[] };
export default function TournamentApp({ library = false }: { library?: boolean }) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Tournament['status'] | 'all'>('all');
  const [game, setGame] = useState<Tournament['game'] | 'all'>('all');
  const [filters, setFilters] = useState(false);
  const refresh = useCallback(() => {
    try {
      setEvents(
        store.tournaments().map((tournament) => ({
          tournament,
          matches: tournament.status === 'active' ? store.matches(tournament.id) : [],
          players: tournament.status === 'active' ? store.participants(tournament.id) : [],
        })),
      );
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const active = events.filter(({ tournament }) => tournament.status === 'active');
  const pending = active.flatMap((event) =>
    event.matches
      .filter((match) => match.status === 'pending' && match.p1 !== null && match.p2 !== null)
      .map((match) => ({ ...event, match })),
  );
  const visible = events.filter(
    ({ tournament }) =>
      tournament.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
      (status === 'all' || tournament.status === status) &&
      (game === 'all' || tournament.game === game),
  );
  const open = (tournament: Tournament) => router.push(tournamentPath(tournament.id));
  const cards = (data: EventData[]) =>
    data.map(({ tournament, matches }) => (
      <TournamentCard
        key={tournament.id}
        tournament={tournament}
        onPress={() => open(tournament)}
        progress={
          tournament.status === 'active'
            ? {
                done: matches.filter((match) => match.status === 'done').length,
                total: matches.filter((match) => match.status !== 'bye').length,
              }
            : undefined
        }
      />
    ));
  return (
    <Page
      title={library ? 'Tournaments' : 'CueBracket'}
      brand={!library}
      subtitle={library ? 'Draws and tournament history' : '8-Ball Pool & Snooker'}
    >
      {error ? (
        <EmptyState
          title="Couldn’t load tournaments"
          description={error}
          action="Try again"
          onAction={refresh}
        />
      ) : (
        <>
          {!library ? (
            <>
              <Btn title="New tournament" icon="plus" onPress={() => router.push('/create')} />
              {events.length > 0 ? (
                <Text style={[styles.muted, { marginTop: 16 }]}>
                  {active.length} active · {pending.length} matches ready for a result
                </Text>
              ) : null}
              {active.length ? (
                <>
                  <SectionHeading title="Active tournaments" />
                  {cards(active.slice(0, 3))}
                </>
              ) : null}
              {pending.length ? (
                <>
                  <SectionHeading title="Ready for a result" detail={`${pending.length} matches`} />
                  {pending.slice(0, 3).map(({ tournament, match, players }) => (
                    <View key={match.id}>
                      <Text style={[styles.muted, { marginBottom: 8 }]}>{tournament.name}</Text>
                      <MatchCard
                        match={match}
                        players={players}
                        onPress={() =>
                          router.push(`${tournamentPath(tournament.id)}/match/${match.id}`)
                        }
                      />
                    </View>
                  ))}
                </>
              ) : null}
              {events.some(({ tournament }) => tournament.status !== 'active') ? (
                <>
                  <SectionHeading title="Recent tournaments" />
                  {cards(
                    events.filter(({ tournament }) => tournament.status !== 'active').slice(0, 3),
                  )}
                </>
              ) : null}
              {events.length === 0 ? (
                <View style={{ marginTop: 32 }}>
                  <EmptyState
                    title="No tournaments yet"
                    description="Create an event, add your players, and review the draw before starting."
                  />
                </View>
              ) : null}
              <Btn
                title="All tournaments"
                icon="arrow-right"
                secondary
                onPress={() => router.navigate('/tournaments')}
              />
            </>
          ) : (
            <>
              <Btn title="New tournament" icon="plus" onPress={() => router.push('/create')} />
              <Field
                label="Search tournaments"
                placeholder="Find your competition"
                value={query}
                onChangeText={setQuery}
              />
              <Choice<Tournament['status'] | 'all'>
                value={status}
                onChange={setStatus}
                options={[
                  { label: 'All', value: 'all' },
                  { label: 'In progress', value: 'active' },
                  { label: 'Setup', value: 'setup' },
                  { label: 'Completed', value: 'complete' },
                ]}
              />
              <Btn
                title={filters ? 'Hide game filters' : 'Filter by game'}
                secondary
                onPress={() => setFilters(!filters)}
              />
              {filters ? (
                <Choice<Tournament['game'] | 'all'>
                  value={game}
                  onChange={setGame}
                  options={[
                    { label: 'All games', value: 'all' },
                    { label: '8-Ball Pool', value: '8ball' },
                    { label: 'Snooker', value: 'snooker' },
                  ]}
                />
              ) : null}
              {query !== '' || status !== 'all' || game !== 'all' ? (
                <Btn
                  title="Clear filters"
                  secondary
                  onPress={() => {
                    setQuery('');
                    setStatus('all');
                    setGame('all');
                  }}
                />
              ) : null}
              <Text style={styles.label} accessibilityLiveRegion="polite">
                {visible.length} OF {events.length} TOURNAMENTS
                {game !== 'all' ? ` · ${game === '8ball' ? '8-Ball' : 'Snooker'}` : ''}
              </Text>
              {visible.length ? (
                cards(visible)
              ) : (
                <EmptyState
                  title={events.length ? 'No matches found' : 'Your first tournament awaits'}
                  description={
                    events.length
                      ? 'Try another name or clear your filters.'
                      : 'Create an event, register your players, then confirm the draw.'
                  }
                />
              )}
            </>
          )}
        </>
      )}
    </Page>
  );
}

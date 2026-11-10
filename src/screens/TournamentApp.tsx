import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as store from '../db';
import { formatLabel, type Tournament } from '../engine';
import { baseScoringRule, scoringLabel } from '../rules';
import { tournamentPath } from '../navigation';
import { Btn, C, Card, Choice, Field, Page, styles } from '../ui';

// Home route: refresh persisted tournament history whenever this screen gains focus.
export default function TournamentApp() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Tournament['status'] | 'all'>('all');
  const [game, setGame] = useState<Tournament['game'] | 'all'>('all');
  const visibleTournaments = tournaments.filter(
    (tournament) =>
      tournament.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
      (status === 'all' || tournament.status === status) &&
      (game === 'all' || tournament.game === game),
  );
  const clearFilters = () => {
    setQuery('');
    setStatus('all');
    setGame('all');
  };
  const refresh = useCallback(() => {
    try {
      setTournaments(store.tournaments());
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
  return (
    <Page title="CueBracket" subtitle="Pool & Snooker · Offline Tournament Manager">
      <Btn title="Create Tournament" onPress={() => router.push('/create')} />
      <Text style={styles.label}>YOUR TOURNAMENTS</Text>
      {!error && tournaments.length > 0 ? (
        <Card>
          <Field
            label="Search tournaments"
            value={query}
            onChangeText={setQuery}
            placeholder="Tournament name"
          />
          <Text style={styles.label}>STATUS</Text>
          <Choice<Tournament['status'] | 'all'>
            value={status}
            onChange={setStatus}
            options={[
              { label: 'All statuses', value: 'all' },
              { label: 'Setup', value: 'setup' },
              { label: 'In progress', value: 'active' },
              { label: 'Completed', value: 'complete' },
            ]}
          />
          <Text style={styles.label}>GAME</Text>
          <Choice<Tournament['game'] | 'all'>
            value={game}
            onChange={setGame}
            options={[
              { label: 'All games', value: 'all' },
              { label: '8-Ball Pool', value: '8ball' },
              { label: 'Snooker', value: 'snooker' },
            ]}
          />
          <Text style={styles.muted} accessibilityLiveRegion="polite">
            Showing {visibleTournaments.length} of {tournaments.length} tournaments
          </Text>
          {query !== '' || status !== 'all' || game !== 'all' ? (
            <Btn title="Clear filters" secondary onPress={clearFilters} />
          ) : null}
        </Card>
      ) : null}
      {error ? (
        <Card>
          <Text style={styles.text}>{error}</Text>
          <Btn title="Retry" onPress={refresh} />
        </Card>
      ) : tournaments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No tournaments yet. Create your first competition.</Text>
        </Card>
      ) : visibleTournaments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No tournaments match your search and filters.</Text>
        </Card>
      ) : (
        visibleTournaments.map((tournament) => (
          <TouchableOpacity
            key={tournament.id}
            style={styles.card}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tournament.name}, ${tournament.status}`}
            onPress={() => router.push(tournamentPath(tournament.id))}
          >
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              <Text style={[styles.text, { flexShrink: 1, fontWeight: '800' }]}>
                {tournament.name}
              </Text>
              <Text style={{ color: tournament.status === 'complete' ? C.gold : C.green }}>
                {tournament.status}
              </Text>
            </View>
            <Text style={[styles.muted, { marginTop: 8 }]}>
              {tournament.game === '8ball' ? '8-Ball Pool' : 'Snooker'} ·{' '}
              {formatLabel(tournament.format)} ·{' '}
              {scoringLabel(baseScoringRule(tournament), tournament.first_to_label)}
            </Text>
            {Number.isFinite(Date.parse(tournament.created_at)) ? (
              <Text style={[styles.muted, { marginTop: 8 }]}>
                Created {new Date(tournament.created_at).toLocaleDateString()}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))
      )}
    </Page>
  );
}

import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Text, View } from 'react-native';
import * as store from '../db';
import type { Player, Tournament } from '../engine';
import { tournamentPath } from '../navigation';
import PlayerCard from '../components/PlayerCard';
import { Btn, EmptyState, Field, Page, SectionHeading, styles } from '../ui';

export default function PlayerDirectoryScreen() {
  const [groups, setGroups] = useState<{ tournament: Tournament; players: Player[] }[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    try {
      setGroups(
        store
          .tournaments()
          .map((tournament) => ({ tournament, players: store.participants(tournament.id) })),
      );
      setError(null);
    } catch (error) {
      setError(String(error));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );
  const visible = groups
    .map((group) => ({
      ...group,
      players: group.players.filter((player) =>
        player.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
      ),
    }))
    .filter((group) => group.players.length);
  return (
    <Page title="Players" subtitle="Your registrations, organized by tournament.">
      <Field
        label="Search players"
        value={query}
        onChangeText={setQuery}
        placeholder="Find a player"
      />
      {error ? (
        <EmptyState
          title="Couldn’t load players"
          description={error}
          action="Retry"
          onAction={refresh}
        />
      ) : visible.length ? (
        visible.map(({ tournament, players }) => (
          <View key={tournament.id} style={{ marginBottom: 16 }}>
            <SectionHeading title={tournament.name} detail={`${players.length} shown`} />
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
            <Btn
              title={tournament.status === 'setup' ? 'Manage registrations' : 'View tournament'}
              secondary
              onPress={() =>
                router.push(
                  tournament.status === 'setup'
                    ? `${tournamentPath(tournament.id)}/players`
                    : tournamentPath(tournament.id),
                )
              }
            />
          </View>
        ))
      ) : (
        <EmptyState
          title="No players here yet"
          description="Register players inside a tournament, or try a different search."
          action="Browse tournaments"
          onAction={() => router.navigate('/tournaments')}
        />
      )}
      <Text style={styles.muted}>
        Player registrations belong to their tournament. Historical names stay protected after play
        starts.
      </Text>
    </Page>
  );
}

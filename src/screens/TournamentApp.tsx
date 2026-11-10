import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as store from '../db';
import type { Tournament } from '../engine';
import { baseScoringRule, scoringLabel } from '../rules';
import { tournamentPath } from '../navigation';
import { Btn, C, Card, Page, styles } from '../ui';

// Home route: refresh persisted tournament history whenever this screen gains focus.
export default function TournamentApp() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [error, setError] = useState<string | null>(null);
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
      {error ? (
        <Card>
          <Text style={styles.text}>{error}</Text>
          <Btn title="Retry" onPress={refresh} />
        </Card>
      ) : tournaments.length === 0 ? (
        <Card>
          <Text style={styles.muted}>No tournaments yet. Create your first competition.</Text>
        </Card>
      ) : (
        tournaments.map((tournament) => (
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
              {tournament.format === 'knockout' ? 'Knockout' : 'Round robin'} ·{' '}
              {scoringLabel(baseScoringRule(tournament), tournament.first_to_label)}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </Page>
  );
}

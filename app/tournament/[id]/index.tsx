import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import TournamentRoute from '../../../src/components/TournamentRoute';
import TournamentDetailScreen from '../../../src/screens/TournamentDetailScreen';
import * as store from '../../../src/db';
import { canScoreMatch, tournamentPath } from '../../../src/navigation';
import { errorAlert } from '../../../src/ui';

export default function DetailRoute() {
  return (
    <TournamentRoute>
      {(data) => {
        const path = tournamentPath(data.tournament.id);
        return (
          <TournamentDetailScreen
            {...data}
            onEdit={() => router.push(`${path}/edit`)}
            onPlayers={() => router.push(`${path}/players`)}
            onDraw={() => router.push(`${path}/draw`)}
            onResults={() => router.push(`${path}/results`)}
            onScore={(match) => {
              if (canScoreMatch(data.tournament, match)) router.push(`${path}/match/${match.id}`);
            }}
            onHome={() => router.dismissTo('/')}
            onDelete={() =>
              Alert.alert(
                'Delete tournament?',
                'This will permanently delete the tournament and its results.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      try {
                        store.deleteTournament(data.tournament.id);
                        router.dismissTo('/');
                      } catch (error) {
                        errorAlert(error);
                      }
                    },
                  },
                ],
              )
            }
          />
        );
      }}
    </TournamentRoute>
  );
}

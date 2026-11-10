import React from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import TournamentRoute from '../../../src/components/TournamentRoute';
import DrawScreen from '../../../src/screens/DrawScreen';
import * as store from '../../../src/db';
import { tournamentPath } from '../../../src/navigation';
import { errorAlert } from '../../../src/ui';

export default function DrawRoute() {
  return (
    <TournamentRoute view="draw">
      {({ tournament, players }) => (
        <DrawScreen
          tournamentName={tournament.name}
          tournament={tournament}
          format={tournament.format}
          players={players}
          onBack={() => router.dismissTo(`${tournamentPath(tournament.id)}/players`)}
          onStart={(order) =>
            Alert.alert(
              'Step 6 of 6 · Start tournament?',
              `${players.length} players · ${tournament.name}. Review complete? The draw and settings will lock after starting.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Start',
                  onPress: () => {
                    try {
                      store.startTournament(tournament.id, order);
                      router.dismissTo(tournamentPath(tournament.id));
                    } catch (error) {
                      errorAlert(error);
                    }
                  },
                },
              ],
            )
          }
        />
      )}
    </TournamentRoute>
  );
}

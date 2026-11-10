import React from 'react';
import { router } from 'expo-router';
import TournamentRoute from '../../../src/components/TournamentRoute';
import TournamentSettingsScreen from '../../../src/screens/TournamentSettingsScreen';
import * as store from '../../../src/db';
import { tournamentPath } from '../../../src/navigation';

export default function EditRoute() {
  return (
    <TournamentRoute view="edit">
      {({ tournament }) => (
        <TournamentSettingsScreen
          initial={tournament}
          onSave={(settings) => {
            store.updateTournament(
              tournament.id,
              settings.name,
              settings.game,
              settings.format,
              settings.bestOf,
              settings.scoring,
            );
            router.dismissTo(tournamentPath(tournament.id));
          }}
          onCancel={() => router.dismissTo(tournamentPath(tournament.id))}
        />
      )}
    </TournamentRoute>
  );
}

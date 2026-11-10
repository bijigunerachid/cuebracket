import React from 'react';
import { router } from 'expo-router';
import * as store from '../src/db';
import TournamentSettingsScreen from '../src/screens/TournamentSettingsScreen';

export default function CreateRoute() {
  return (
    <TournamentSettingsScreen
      onSave={(settings) => {
        const id = store.createTournament(
          settings.name,
          settings.game,
          settings.format,
          settings.bestOf,
          settings.scoring,
        );
        router.replace(`/tournament/${id}/players`);
      }}
      onCancel={() => router.dismissTo('/')}
    />
  );
}

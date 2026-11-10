import React from 'react';
import { router } from 'expo-router';
import TournamentRoute from '../../../src/components/TournamentRoute';
import TournamentResultsScreen from '../../../src/screens/TournamentResultsScreen';
import { tournamentPath } from '../../../src/navigation';

export default function ResultsRoute() {
  return (
    <TournamentRoute view="results">
      {(data) => (
        <TournamentResultsScreen
          {...data}
          onMatches={() => router.dismissTo(tournamentPath(data.tournament.id))}
          onHome={() => router.dismissTo('/')}
        />
      )}
    </TournamentRoute>
  );
}

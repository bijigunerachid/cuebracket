import React from 'react';
import { router } from 'expo-router';
import TournamentRoute from '../../../src/components/TournamentRoute';
import PlayersScreen from '../../../src/screens/PlayersScreen';
import * as store from '../../../src/db';
import { tournamentPath } from '../../../src/navigation';

export default function PlayersRoute() {
  return (
    <TournamentRoute view="players">
      {({ tournament, players }, refresh) => (
        <PlayersScreen
          tournamentName={tournament.name}
          players={players}
          returningPlayers={store.reusablePlayers(tournament.id)}
          onAddReturning={(ids) => {
            store.registerReturningPlayers(tournament.id, ids);
            refresh();
          }}
          onAdd={(name) => {
            store.addPlayer(tournament.id, name);
            refresh();
          }}
          onRename={(id, name) => {
            store.renamePlayer(tournament.id, id, name);
            refresh();
          }}
          onRemove={(id) => {
            store.removePlayer(tournament.id, id);
            refresh();
          }}
          onContinue={() => router.push(`${tournamentPath(tournament.id)}/draw`)}
          onBack={() => router.dismissTo(tournamentPath(tournament.id))}
        />
      )}
    </TournamentRoute>
  );
}

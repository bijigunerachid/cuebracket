import React from 'react';
import { Alert } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import TournamentRoute from '../../../../src/components/TournamentRoute';
import MatchScoreScreen from '../../../../src/screens/MatchScoreScreen';
import * as store from '../../../../src/db';
import { canScoreMatch, parseRouteId, tournamentPath } from '../../../../src/navigation';
import { errorAlert } from '../../../../src/ui';

export default function ScoreRoute() {
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = parseRouteId(params.matchId);
  return (
    <TournamentRoute>
      {({ tournament, matches, players }) => {
        const match = matches.find((row) => row.id === matchId);
        const path = tournamentPath(tournament.id);
        if (!canScoreMatch(tournament, match)) return <Redirect href={path} />;
        return (
          <MatchScoreScreen
            key={match.id}
            tournament={tournament}
            match={match}
            players={players}
            onCancel={() => router.dismissTo(path)}
            onSave={(first, second) =>
              Alert.alert(
                'Confirm result?',
                `${players.find((player) => player.id === match.p1)?.name} ${first} – ${second} ${players.find((player) => player.id === match.p2)?.name}. Results cannot be edited in this version.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    onPress: () => {
                      try {
                        store.saveResult(tournament.id, match.id, first, second);
                        router.dismissTo(path);
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

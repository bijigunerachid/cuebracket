import React from 'react';
import { Alert } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import TournamentRoute from '../../../../src/components/TournamentRoute';
import MatchScoreScreen from '../../../../src/screens/MatchScoreScreen';
import * as store from '../../../../src/db';
import {
  canCorrectMatch,
  canScoreMatch,
  parseRouteId,
  tournamentPath,
} from '../../../../src/navigation';
import { errorAlert, useFeedback } from '../../../../src/ui';

export default function ScoreRoute() {
  const feedback = useFeedback();
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = parseRouteId(params.matchId);
  return (
    <TournamentRoute>
      {({ tournament, matches, players }) => {
        const match = matches.find((row) => row.id === matchId);
        const path = tournamentPath(tournament.id);
        if (!canScoreMatch(tournament, match) && !canCorrectMatch(tournament, match))
          return <Redirect href={path} />;
        const correcting = match.status === 'done';
        return (
          <MatchScoreScreen
            key={`${match.id}-${match.s1}-${match.s2}`}
            tournament={tournament}
            match={match}
            players={players}
            onCancel={() => router.dismissTo(path)}
            onSave={(first, second) =>
              Alert.alert(
                correcting ? 'Confirm correction?' : 'Confirm result?',
                `${players.find((player) => player.id === match.p1)?.name} ${first} – ${second} ${players.find((player) => player.id === match.p2)?.name}.${correcting ? ` Replaces ${match.s1}–${match.s2}. Any affected unplayed advancement will be updated.` : ' Review the scores before confirming.'}`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Confirm',
                    onPress: () => {
                      try {
                        if (correcting)
                          store.correctResult(tournament.id, match.id, first, second, match);
                        else store.saveResult(tournament.id, match.id, first, second);
                        feedback('confirm');
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

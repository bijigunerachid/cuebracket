import React, { useCallback, useState } from 'react';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as store from '../db';
import type { Match, Player, Tournament } from '../engine';
import { parseRouteId, tournamentRedirect, TournamentView } from '../navigation';
import { Btn, Page } from '../ui';

export type TournamentData = {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
  standings: ReturnType<typeof store.standings>;
};

type Props = {
  view?: TournamentView;
  children: (data: TournamentData, refresh: () => void) => React.ReactNode;
};

export default function TournamentRoute({ view = 'detail', children }: Props) {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = parseRouteId(params.id);
  const [data, setData] = useState<TournamentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(() => {
    setData(null);
    if (id === null) {
      setError('Invalid tournament link');
      return;
    }
    try {
      const tournament = store.tournament(id);
      if (!tournament) throw Error('This tournament no longer exists');
      setData({
        tournament,
        players: store.participants(id),
        matches: store.matches(id),
        standings: store.standings(id),
      });
      setError(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (error)
    return (
      <Page title="Tournament unavailable" subtitle={error}>
        <Btn title="Retry" onPress={refresh} />
        <Btn title="All Tournaments" secondary onPress={() => router.dismissTo('/')} />
      </Page>
    );
  if (!data || data.tournament.id !== id) return <Page title="Loading Tournament" />;
  const redirect = tournamentRedirect(view, data.tournament, data.players.length);
  if (redirect) return <Redirect href={redirect} />;
  return <>{children(data, refresh)}</>;
}

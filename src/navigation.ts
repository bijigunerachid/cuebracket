import type { Match, Tournament } from './engine';

export function parseRouteId(value: unknown): number | null {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export const tournamentPath = (id: number) => `/tournament/${id}` as const;
export type TournamentView = 'detail' | 'edit' | 'players' | 'draw' | 'results';

export function tournamentRedirect(
  view: TournamentView,
  tournament: Tournament,
  playerCount: number,
) {
  const detail = tournamentPath(tournament.id);
  if (['edit', 'players', 'draw'].includes(view) && tournament.status !== 'setup') return detail;
  if (view === 'draw' && playerCount < 2) return `${detail}/players` as const;
  if (view === 'results' && tournament.status !== 'complete') return detail;
  return null;
}

export function canScoreMatch(tournament: Tournament, match: Match | undefined): match is Match {
  return (
    tournament.status === 'active' &&
    match?.tournament_id === tournament.id &&
    match.status === 'pending' &&
    match.p1 !== null &&
    match.p2 !== null
  );
}

export function canCorrectMatch(tournament: Tournament, match: Match | undefined): match is Match {
  return (
    ['active', 'complete'].includes(tournament.status) &&
    match?.tournament_id === tournament.id &&
    match.status === 'done' &&
    match.p1 !== null &&
    match.p2 !== null
  );
}

export type Format = 'knockout' | 'dynamic_knockout' | 'round_robin';
export const MAX_DYNAMIC_PLAYERS = 128;
export const formatLabel = (format: Format) =>
  format === 'dynamic_knockout'
    ? 'Dynamic Knockout'
    : format === 'knockout'
      ? 'Knockout'
      : 'Round robin';

export function dynamicSummary(count: number) {
  if (!Number.isInteger(count) || count < 2 || count > MAX_DYNAMIC_PLAYERS)
    throw Error(`Dynamic Knockout supports 2–${MAX_DYNAMIC_PLAYERS} players`);
  return {
    players: count,
    matches: Math.floor(count / 2),
    byes: count % 2,
    advancing: Math.ceil(count / 2),
    rounds: Math.ceil(Math.log2(count)),
  };
}

// Input order is the confirmed preview or a freshly shuffled set of qualifiers.
export function dynamicPairs(ids: number[], round = 1) {
  dynamicSummary(ids.length);
  if (!Number.isSafeInteger(round) || round < 1) throw Error('Invalid round number');
  if (new Set(ids).size !== ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1))
    throw Error('Draw must contain each player exactly once');
  const pairs: { round: number; slot: number; p1: number; p2: number | null }[] = [];
  for (let index = 0; index < ids.length; index += 2)
    pairs.push({ round, slot: pairs.length, p1: ids[index], p2: ids[index + 1] ?? null });
  return pairs;
}
export type Game = '8ball' | 'snooker';
export type ScoringMode = 'best_of' | 'first_to';
export type ScoringRule = { mode: ScoringMode; value: number };
export type RoundStage = 'preliminary' | 'quarterfinal' | 'semifinal' | 'final';
export type ScoringOptions = {
  mode: ScoringMode;
  label: string;
  rounds: Partial<Record<RoundStage, ScoringRule>>;
};
export type TournamentSettings = {
  name: string;
  game: Game;
  format: Format;
  bestOf: number;
  scoring?: ScoringOptions;
};
export type Player = { id: number; name: string };
export type Match = {
  id: number;
  tournament_id: number;
  round: number;
  slot: number;
  p1: number | null;
  p2: number | null;
  s1: number | null;
  s2: number | null;
  winner: number | null;
  status: 'pending' | 'done' | 'bye';
  target?: number | null;
  scoring_mode?: ScoringMode;
  scoring_value?: number | null;
};
export type Tournament = {
  id: number;
  name: string;
  game: Game;
  format: Format;
  best_of: number;
  status: 'setup' | 'active' | 'complete';
  created_at: string;
  scoring_mode?: ScoringMode;
  first_to_label?: string;
  round_rules?: string;
};
export const winsNeeded = (bestOf: number) => Math.floor(bestOf / 2) + 1;
export function validateSettings(game: Game, format: Format, bestOf: number) {
  if (game !== '8ball' && game !== 'snooker') throw Error('Unsupported game');
  if (format !== 'knockout' && format !== 'dynamic_knockout' && format !== 'round_robin')
    throw Error('Unsupported tournament format');
  if (!Number.isSafeInteger(bestOf) || bestOf < 1 || bestOf % 2 === 0)
    throw Error('Best of must be a positive odd integer');
}
export function tiedLeaders<T extends { wins: number; diff: number }>(rankings: T[]): T[] {
  const first = rankings[0];
  return first ? rankings.filter((r) => r.wins === first.wins && r.diff === first.diff) : [];
}
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const sample = random();
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw Error('Invalid random sample');
    const j = Math.floor(sample * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function assignDrawPlayer(order: number[], position: number, playerId: number): number[] {
  if (!Number.isInteger(position) || position < 0 || position >= order.length)
    throw Error('Invalid draw position');
  if (new Set(order).size !== order.length) throw Error('Draw contains duplicate players');
  const previousPosition = order.indexOf(playerId);
  if (previousPosition === -1) throw Error('Player is not in this draw');
  const next = [...order];
  [next[position], next[previousPosition]] = [next[previousPosition], next[position]];
  return next;
}
export function knockoutPairs(
  ids: number[],
): { round: number; slot: number; p1: number | null; p2: number | null }[] {
  if (ids.length < 2) throw Error('Add at least 2 players');
  if (new Set(ids).size !== ids.length || ids.some((id) => !Number.isSafeInteger(id) || id < 1))
    throw Error('Draw requires unique player IDs');
  const size = 2 ** Math.ceil(Math.log2(ids.length));
  // Reserve one whole match for each BYE; fill only the remaining matches.
  const byes = size - ids.length;
  const pairs: { round: number; slot: number; p1: number | null; p2: number | null }[] = [];
  let cursor = 0;
  for (let slot = 0; slot < size / 2; slot++) {
    pairs.push({ round: 1, slot, p1: ids[cursor++], p2: slot < byes ? null : ids[cursor++] });
  }
  return pairs;
}
export function roundRobinPairs(
  ids: number[],
): { round: number; slot: number; p1: number | null; p2: number | null }[] {
  if (ids.length < 2) throw Error('Add at least 2 players');
  let a: (number | null)[] = [...ids];
  if (a.length % 2) a.push(null);
  const out: { round: number; slot: number; p1: number | null; p2: number | null }[] = [];
  for (let r = 0; r < a.length - 1; r++) {
    for (let i = 0; i < a.length / 2; i++) {
      const x = a[i],
        y = a[a.length - 1 - i];
      if (x !== null && y !== null) out.push({ round: r + 1, slot: i, p1: x, p2: y });
    }
    a = [a[0], a[a.length - 1], ...a.slice(1, -1)];
  }
  return out;
}
export function validateScore(s1: number, s2: number, bestOf: number) {
  if (!Number.isSafeInteger(bestOf) || bestOf < 1 || bestOf % 2 === 0) return false;
  const target = winsNeeded(bestOf);
  return (
    Number.isSafeInteger(s1) &&
    Number.isSafeInteger(s2) &&
    s1 >= 0 &&
    s2 >= 0 &&
    Math.max(s1, s2) === target &&
    Math.min(s1, s2) < target
  );
}

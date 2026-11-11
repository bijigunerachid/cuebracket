import type { Match, Player, Tournament } from './engine';
import { MAX_DYNAMIC_PLAYERS, validateSettings } from './engine';
import { baseScoringRule, scoringOptions, scoringTarget, validateTargetScore } from './rules';

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
export type Registration = { tournament_id: number; player_id: number; position: number };
export type Backup = {
  app: 'CueBracket';
  version: 1;
  createdAt: string;
  tournaments: Tournament[];
  players: Player[];
  registrations: Registration[];
  matches: Match[];
};

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(`Invalid backup: ${message}`);
}
function record(value: unknown): Record<string, unknown> {
  check(value && typeof value === 'object' && !Array.isArray(value), 'expected an object');
  return value as Record<string, unknown>;
}
function integer(value: unknown, minimum = 1): number {
  check(Number.isSafeInteger(value) && (value as number) >= minimum, 'invalid integer');
  return value as number;
}
function text(value: unknown): string {
  check(typeof value === 'string' && value.trim() && value.length <= 10000, 'invalid text');
  return value;
}
function list(value: unknown, limit: number): unknown[] {
  check(Array.isArray(value) && value.length <= limit, 'too many records or missing list');
  return value;
}
function uniqueIds<T extends { id: number }>(rows: T[]) {
  check(new Set(rows.map((row) => row.id)).size === rows.length, 'duplicate IDs');
}
function validDate(value: string) {
  // SQLite CURRENT_TIMESTAMP uses a space; normalize it for Android's ISO date parser.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  return Number.isFinite(Date.parse(iso));
}
function samePlayers(actual: number[], expected: number[]) {
  check(
    actual.length === expected.length &&
      new Set(actual).size === actual.length &&
      actual.every((id) => expected.includes(id)),
    'players duplicated, missing, or advanced incorrectly',
  );
}

// Whitelist and normalize fields. Imported JSON is data, never SQL or executable code.
export function validateBackup(value: unknown): Backup {
  const data = record(value);
  check(data.app === 'CueBracket' && data.version === 1, 'unsupported file or backup version');
  const createdAt = text(data.createdAt);
  check(validDate(createdAt), 'invalid backup date');
  const tournaments = list(data.tournaments, 1000).map((value) => {
    const row = record(value);
    const t = {
      id: integer(row.id),
      name: text(row.name),
      game: row.game,
      format: row.format,
      best_of: integer(row.best_of),
      status: row.status,
      created_at: text(row.created_at),
      scoring_mode: row.scoring_mode ?? 'best_of',
      first_to_label: row.first_to_label ?? 'First to',
      round_rules: row.round_rules ?? '{}',
    } as Tournament;
    validateSettings(t.game, t.format, t.best_of);
    check(['setup', 'active', 'complete'].includes(t.status), 'invalid tournament status');
    check(typeof t.round_rules === 'string', 'invalid scoring rules');
    scoringOptions(t);
    scoringTarget(baseScoringRule(t));
    check(validDate(t.created_at), 'invalid tournament date');
    return t;
  });
  const players = list(data.players, 10000).map((value) => {
    const row = record(value);
    return { id: integer(row.id), name: text(row.name) };
  });
  const registrations = list(data.registrations, 50000).map((value) => {
    const row = record(value);
    return {
      tournament_id: integer(row.tournament_id),
      player_id: integer(row.player_id),
      position: integer(row.position, 0),
    };
  });
  const matches = list(data.matches, 50000).map((value) => {
    const row = record(value);
    const nullable = (key: string, minimum = 1) =>
      row[key] === null ? null : integer(row[key], minimum);
    const m = {
      id: integer(row.id),
      tournament_id: integer(row.tournament_id),
      round: integer(row.round),
      slot: integer(row.slot, 0),
      p1: nullable('p1'),
      p2: nullable('p2'),
      winner: nullable('winner'),
      s1: nullable('s1', 0),
      s2: nullable('s2', 0),
      status: row.status,
      target: row.target,
      scoring_mode: row.scoring_mode,
      scoring_value: row.scoring_value,
    } as Match;
    check(['pending', 'done', 'bye'].includes(m.status), 'invalid match status');
    return m;
  });
  uniqueIds(tournaments);
  uniqueIds(players);
  uniqueIds(matches);
  const tournamentIds = new Set(tournaments.map((t) => t.id));
  const playerIds = new Set(players.map((p) => p.id));
  check(
    registrations.every((r) => tournamentIds.has(r.tournament_id) && playerIds.has(r.player_id)),
    'unknown registration',
  );
  check(
    matches.every((m) => tournamentIds.has(m.tournament_id)),
    'unknown match tournament',
  );
  for (const t of tournaments) {
    const registrationsForEvent = registrations.filter((r) => r.tournament_id === t.id);
    const ids = registrationsForEvent.map((r) => r.player_id);
    check(new Set(ids).size === ids.length, 'duplicate registration');
    check(
      new Set(registrationsForEvent.map((r) => r.position)).size === ids.length,
      'duplicate player position',
    );
    check(
      t.format !== 'dynamic_knockout' || ids.length <= MAX_DYNAMIC_PLAYERS,
      'dynamic player limit exceeded',
    );
    const games = matches.filter((m) => m.tournament_id === t.id);
    for (const m of games) {
      const rule =
        m.scoring_value == null
          ? baseScoringRule(t)
          : { mode: m.scoring_mode ?? 'best_of', value: m.scoring_value };
      const target = scoringTarget(rule);
      check(m.target == null || m.target === target, 'inconsistent score target');
      m.target = target;
      m.scoring_mode = rule.mode;
      m.scoring_value = rule.value;
      check(
        [m.p1, m.p2, m.winner].every((id) => id === null || ids.includes(id)),
        'unregistered player in match',
      );
      check(m.p1 === null || m.p1 !== m.p2, 'player plays themselves');
      if (m.status === 'done') {
        check(
          m.p1 !== null &&
            m.p2 !== null &&
            m.s1 !== null &&
            m.s2 !== null &&
            validateTargetScore(m.s1, m.s2, target),
          'invalid result',
        );
        check(m.winner === (m.s1 > m.s2 ? m.p1 : m.p2), 'incorrect match winner');
      } else {
        check(m.s1 === null && m.s2 === null, 'unplayed match has a score');
        check(
          m.status === 'bye'
            ? (m.p1 === null) !== (m.p2 === null) && m.winner === (m.p1 ?? m.p2)
            : m.winner === null,
          'invalid advancement',
        );
      }
    }
    validateSchedule(t, ids, games);
  }
  return { app: 'CueBracket', version: 1, createdAt, tournaments, players, registrations, matches };
}

function validateSchedule(t: Tournament, ids: number[], games: Match[]) {
  if (t.status === 'setup') {
    check(games.length === 0, 'setup tournament already has matches');
    return;
  }
  check(ids.length >= 2 && games.length > 0, 'started tournament is empty');
  const rounds = new Map<number, Match[]>();
  for (const m of games) rounds.set(m.round, [...(rounds.get(m.round) ?? []), m]);
  const count = rounds.size;
  for (let round = 1; round <= count; round++) {
    const current = rounds.get(round);
    check(current, 'missing round');
    current.sort((a, b) => a.slot - b.slot);
    check(
      t.format === 'round_robin'
        ? new Set(current.map((m) => m.slot)).size === current.length &&
            current.every((m) => m.slot < Math.ceil(ids.length / 2))
        : current.every((m, index) => m.slot === index),
      'invalid or duplicate match slots',
    );
  }
  const last = rounds.get(count)!;
  if (t.format === 'round_robin') {
    check(games.length === (ids.length * (ids.length - 1)) / 2, 'incomplete round robin schedule');
    const pairs = new Set<string>();
    for (const current of rounds.values()) {
      const active: number[] = [];
      for (const m of current) {
        check(m.status !== 'bye' && m.p1 !== null && m.p2 !== null, 'invalid round robin pairing');
        active.push(m.p1, m.p2);
        pairs.add([m.p1, m.p2].sort((a, b) => a - b).join(':'));
      }
      check(new Set(active).size === active.length, 'player scheduled twice in round');
    }
    check(pairs.size === games.length, 'duplicate opponents');
    check(
      (t.status === 'complete') === games.every((m) => m.status === 'done'),
      'incorrect tournament status',
    );
    return;
  }
  if (t.format === 'dynamic_knockout') {
    let active = ids;
    for (let round = 1; round <= count; round++) {
      const current = rounds.get(round)!;
      check(
        active.length >= 2 && current.length === Math.ceil(active.length / 2),
        'incorrect dynamic round size',
      );
      samePlayers(
        current.flatMap((m) => [m.p1, m.p2].filter((id): id is number => id !== null)),
        active,
      );
      check(
        current.filter((m) => m.status === 'bye').length === active.length % 2,
        'incorrect dynamic BYEs',
      );
      check(
        current.every((m) => m.status === 'bye' || (m.p1 !== null && m.p2 !== null)),
        'empty dynamic match',
      );
      const finished = current.every((m) => m.status !== 'pending');
      if (round < count) check(finished, 'next round generated too early');
      else
        check(
          finished ? current.length === 1 && t.status === 'complete' : t.status === 'active',
          'missing next round or incorrect champion',
        );
      active = current.map((m) => m.winner!).filter((id) => id != null);
    }
  } else {
    const size = 2 ** Math.ceil(Math.log2(ids.length));
    check(
      count === Math.log2(size) && games.length === size - 1,
      'incorrect knockout bracket size',
    );
    for (let round = 1; round <= count; round++) {
      const current = rounds.get(round)!;
      check(current.length === size / 2 ** round, 'incorrect knockout round size');
      if (round === 1) {
        samePlayers(
          current.flatMap((m) => [m.p1, m.p2].filter((id): id is number => id !== null)),
          ids,
        );
        check(
          current.every((m) =>
            (m.p1 === null) !== (m.p2 === null)
              ? m.status === 'bye'
              : m.p1 !== null && m.p2 !== null && m.status !== 'bye',
          ),
          'invalid opening BYEs',
        );
      } else {
        const previous = rounds.get(round - 1)!;
        check(
          current.every(
            (m) =>
              m.status !== 'bye' &&
              m.p1 === previous[m.slot * 2].winner &&
              m.p2 === previous[m.slot * 2 + 1].winner,
          ),
          'incorrect bracket advancement',
        );
      }
    }
    check((t.status === 'complete') === (last[0].status === 'done'), 'incorrect champion status');
  }
}

export function parseBackup(contents: string): Backup {
  // File size is also checked before reading; this bound covers non-file callers.
  check(contents.length <= MAX_BACKUP_BYTES, 'file exceeds 10 MB');
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw Error('This file is not valid JSON');
  }
  return validateBackup(value);
}

import { winsNeeded, knockoutPairs, shuffle } from './engine';
import type { Match, ScoringOptions, ScoringRule, Tournament, RoundStage } from './engine';

export const roundStages: RoundStage[] = ['preliminary', 'quarterfinal', 'semifinal', 'final'];
export const stageNames: Record<RoundStage, string> = {
  preliminary: 'Preliminary rounds',
  quarterfinal: 'Quarterfinals',
  semifinal: 'Semifinals',
  final: 'Final',
};

export function scoringTarget(rule: ScoringRule): number {
  if (
    !rule ||
    !['first_to', 'best_of'].includes(rule.mode) ||
    !Number.isSafeInteger(rule.value) ||
    rule.value < 1 ||
    (rule.mode === 'best_of' && rule.value % 2 === 0) ||
    rule.value > Math.floor(Number.MAX_SAFE_INTEGER / 2)
  )
    throw Error('Use a positive integer target, or a positive odd Best-of length');
  return rule.mode === 'first_to' ? rule.value : winsNeeded(rule.value);
}
export function validateScoringOptions(options: ScoringOptions) {
  if (
    !options ||
    !['first_to', 'best_of'].includes(options.mode) ||
    typeof options.label !== 'string' ||
    !options.label.trim() ||
    options.label.length > 24 ||
    !options.rounds ||
    typeof options.rounds !== 'object' ||
    Array.isArray(options.rounds)
  )
    throw Error('Invalid scoring configuration');
  for (const [stage, rule] of Object.entries(options.rounds)) {
    if (!roundStages.includes(stage as RoundStage)) throw Error('Unknown scoring round');
    scoringTarget(rule!);
  }
}
export function scoringOptions(tournament: Tournament): ScoringOptions {
  const options: ScoringOptions = {
    mode: tournament.scoring_mode ?? 'best_of',
    label: tournament.first_to_label ?? 'First to',
    rounds: JSON.parse(tournament.round_rules ?? '{}'),
  };
  validateScoringOptions(options);
  return options;
}
export function baseScoringRule(tournament: Tournament): ScoringRule {
  return tournament.scoring_mode === 'first_to'
    ? { mode: 'first_to', value: winsNeeded(tournament.best_of) }
    : { mode: 'best_of', value: tournament.best_of };
}
export function knockoutSummary(count: number) {
  if (!Number.isSafeInteger(count) || count < 2) throw Error('Add at least 2 players');
  const bracketSize = 2 ** Math.ceil(Math.log2(count));
  return {
    players: count,
    bracketSize,
    byes: bracketSize - count,
    matches: count - bracketSize / 2,
    advancing: bracketSize / 2,
    rounds: Math.log2(bracketSize),
  };
}
export function randomKnockoutDraw(ids: number[], random: () => number = Math.random) {
  const order = shuffle(ids, random);
  return { order, pairs: knockoutPairs(order), summary: knockoutSummary(ids.length) };
}
export function roundStage(round: number, totalRounds: number, playerCount: number): RoundStage {
  if (round === 1 && knockoutSummary(playerCount).byes > 0) return 'preliminary';
  const remaining = totalRounds - round;
  return remaining === 0
    ? 'final'
    : remaining === 1
      ? 'semifinal'
      : remaining === 2
        ? 'quarterfinal'
        : 'preliminary';
}
export function ruleForRound(
  tournament: Tournament,
  round: number,
  totalRounds: number,
  playerCount: number,
): ScoringRule {
  const options = scoringOptions(tournament);
  return tournament.format === 'knockout'
    ? (options.rounds[roundStage(round, totalRounds, playerCount)] ?? baseScoringRule(tournament))
    : baseScoringRule(tournament);
}
export function ruleForMatch(tournament: Tournament, match: Match): ScoringRule {
  return match.scoring_value != null
    ? { mode: match.scoring_mode ?? 'best_of', value: match.scoring_value }
    : baseScoringRule(tournament);
}
export function scoringLabel(rule: ScoringRule, label = 'First to'): string {
  const target = scoringTarget(rule);
  return rule.mode === 'best_of'
    ? `Best of ${rule.value} · first to ${target}`
    : `${label.trim() === 'A' ? `A${target}` : `${label.trim()} ${target}`} · first to ${target}`;
}
export function validateTargetScore(first: number, second: number, target: number) {
  return (
    Number.isSafeInteger(target) &&
    target > 0 &&
    Number.isSafeInteger(first) &&
    Number.isSafeInteger(second) &&
    first >= 0 &&
    second >= 0 &&
    Math.max(first, second) === target &&
    Math.min(first, second) < target
  );
}

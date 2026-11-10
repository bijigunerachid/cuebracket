import type { ScoringRule } from './engine';
import { scoringLabel } from './rules';

// Retain local labels and Best-of targets without repeating the default First-to label.
export function displayScoringLabel(rule: ScoringRule, localLabel = 'First to') {
  return rule.mode === 'first_to' && localLabel.trim().toLocaleLowerCase() === 'first to'
    ? `First to ${rule.value}`
    : scoringLabel(rule, localLabel);
}
export function createdDate(value: string) {
  // SQLite CURRENT_TIMESTAMP is UTC without a zone; ISO values retain their own zone.
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString() : null;
}

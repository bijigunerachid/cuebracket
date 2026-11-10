import type { Match } from './engine';

export type BracketNode = { match: Match; x: number; y: number; width: number; height: number };
export type BracketLine = { x: number; y: number; width: number; height: number };
export type BracketEdge = { from: number; to: number; lines: BracketLine[] };
export type BracketSize = {
  cardWidth: number;
  cardHeight: number;
  columnGap: number;
  rowGap: number;
};

export function buildKnockoutLayout(matches: Match[], size: BracketSize) {
  const { cardWidth, cardHeight, columnGap, rowGap } = size;
  if (
    [cardWidth, cardHeight, columnGap].some((value) => !Number.isFinite(value) || value <= 0) ||
    !Number.isFinite(rowGap) ||
    rowGap < 0
  )
    throw Error('Invalid bracket dimensions');
  const sorted = [...matches].sort((a, b) => a.round - b.round || a.slot - b.slot);
  const seen = new Set<string>();
  const ids = new Set<number>();
  for (const match of sorted) {
    const key = `${match.round}:${match.slot}`;
    if (
      !Number.isSafeInteger(match.round) ||
      match.round < 1 ||
      !Number.isSafeInteger(match.slot) ||
      match.slot < 0 ||
      seen.has(key) ||
      ids.has(match.id)
    ) {
      throw Error('Invalid bracket match positions');
    }
    seen.add(key);
    ids.add(match.id);
  }
  const roundNumbers = [...new Set(sorted.map((match) => match.round))];
  const lastRound = roundNumbers.at(-1) ?? 0;
  const rounds = roundNumbers.map((round, index) => ({
    round,
    label:
      round === lastRound
        ? 'Final'
        : round === lastRound - 1
          ? 'Semifinals'
          : round === lastRound - 2
            ? 'Quarterfinals'
            : `Round ${round}`,
    x: index * (cardWidth + columnGap),
    width: cardWidth,
  }));
  const nodes: BracketNode[] = sorted.map((match) => ({
    match,
    x: rounds.find((round) => round.round === match.round)!.x,
    y: (cardHeight + rowGap) * 2 ** (match.round - 1) * (match.slot + 0.5) - cardHeight / 2,
    width: cardWidth,
    height: cardHeight,
  }));
  if (nodes.some((node) => !Number.isFinite(node.y) || node.y < 0))
    throw Error('Bracket is too large to display');
  const byPosition = new Map(nodes.map((node) => [`${node.match.round}:${node.match.slot}`, node]));
  const edges: BracketEdge[] = [];
  for (const source of nodes) {
    const target = byPosition.get(`${source.match.round + 1}:${Math.floor(source.match.slot / 2)}`);
    if (!target) continue;
    const x = source.x + cardWidth;
    const sourceY = source.y + cardHeight / 2;
    const targetY = target.y + cardHeight / 2;
    const middleX = x + columnGap / 2;
    edges.push({
      from: source.match.id,
      to: target.match.id,
      lines: [
        { x, y: sourceY, width: columnGap / 2, height: 2 },
        {
          x: middleX,
          y: Math.min(sourceY, targetY),
          width: 2,
          height: Math.max(2, Math.abs(targetY - sourceY)),
        },
        { x: middleX, y: targetY, width: target.x - middleX, height: 2 },
      ],
    });
  }
  return {
    rounds,
    nodes,
    edges,
    width: rounds.length ? rounds.length * (cardWidth + columnGap) - columnGap : 0,
    height: nodes.length ? Math.max(...nodes.map((node) => node.y + cardHeight)) + rowGap / 2 : 0,
  };
}

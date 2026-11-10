const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(path) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', 'module', code)(module.exports, require, module);
  return module.exports;
}
const { buildKnockoutLayout } = load('src/bracket.ts');
const { knockoutPairs } = load('src/engine.ts');
const size = { cardWidth: 260, cardHeight: 192, columnGap: 48, rowGap: 24 };
const blank = {
  tournament_id: 1,
  p1: null,
  p2: null,
  s1: null,
  s2: null,
  winner: null,
  status: 'pending',
};
assert.deepEqual(buildKnockoutLayout([], size), {
  rounds: [],
  nodes: [],
  edges: [],
  width: 0,
  height: 0,
});
for (const value of [0, -1, NaN, Infinity])
  assert.throws(() => buildKnockoutLayout([], { ...size, cardHeight: value }));
assert.throws(() => buildKnockoutLayout([], { ...size, rowGap: -1 }));
assert.throws(() => buildKnockoutLayout([{ ...blank, id: 1, round: 0, slot: 0 }], size));
assert.throws(() => buildKnockoutLayout([{ ...blank, id: 1, round: 1, slot: -1 }], size));
assert.throws(() => buildKnockoutLayout([{ ...blank, id: 1, round: 1.5, slot: 0 }], size));
assert.throws(() =>
  buildKnockoutLayout(
    [
      { ...blank, id: 1, round: 1, slot: 0 },
      { ...blank, id: 2, round: 1, slot: 0 },
    ],
    size,
  ),
);
assert.throws(() =>
  buildKnockoutLayout(
    [
      { ...blank, id: 1, round: 1, slot: 0 },
      { ...blank, id: 1, round: 2, slot: 0 },
    ],
    size,
  ),
);

for (let count = 2; count <= 128; count++) {
  const firstRound = knockoutPairs(Array.from({ length: count }, (_, i) => i + 1));
  const matches = firstRound.map((match, index) => ({ ...blank, ...match, id: index + 1 }));
  let matchCount = firstRound.length / 2;
  for (let round = 2; matchCount >= 1; round++, matchCount /= 2) {
    for (let slot = 0; slot < matchCount; slot++)
      matches.push({ ...blank, id: matches.length + 1, round, slot });
  }
  const original = JSON.stringify(matches);
  for (const scale of [1, 1.5, 2]) {
    const dimensions = { ...size, cardHeight: size.cardHeight * scale };
    const layout = buildKnockoutLayout(matches, dimensions);
    assert.equal(layout.nodes.length, matches.length);
    assert.equal(layout.edges.length, matches.length - 1);
    assert.equal(layout.rounds.at(-1).label, 'Final');
    if (layout.rounds.length > 1) assert.equal(layout.rounds.at(-2).label, 'Semifinals');
    for (const node of layout.nodes) {
      assert.ok(node.x >= 0 && node.y >= 0);
      assert.ok(node.x + node.width <= layout.width);
      assert.ok(node.y + node.height <= layout.height);
      const outgoing = layout.edges.filter((edge) => edge.from === node.match.id);
      const nextMatch = matches.find(
        (match) =>
          match.round === node.match.round + 1 && match.slot === Math.floor(node.match.slot / 2),
      );
      assert.equal(outgoing.length, nextMatch ? 1 : 0);
      if (nextMatch) assert.equal(outgoing[0].to, nextMatch.id);
      const incoming = layout.edges.filter((edge) => edge.to === node.match.id);
      assert.equal(incoming.length, node.match.round === 1 ? 0 : 2);
      if (incoming.length) {
        const sources = incoming.map((edge) =>
          layout.nodes.find((source) => source.match.id === edge.from),
        );
        assert.equal(
          node.y + node.height / 2,
          sources.reduce((sum, source) => sum + source.y + source.height / 2, 0) / 2,
        );
      }
    }
    for (const round of layout.rounds) {
      const column = layout.nodes.filter((node) => node.match.round === round.round);
      for (let index = 1; index < column.length; index++)
        assert.ok(column[index].y >= column[index - 1].y + column[index - 1].height + size.rowGap);
    }
    for (const edge of layout.edges) {
      const source = layout.nodes.find((node) => node.match.id === edge.from);
      const target = layout.nodes.find((node) => node.match.id === edge.to);
      assert.equal(edge.lines[0].x, source.x + source.width);
      assert.equal(edge.lines[0].y, source.y + source.height / 2);
      assert.equal(edge.lines[2].x + edge.lines[2].width, target.x);
      assert.equal(edge.lines[2].y, target.y + target.height / 2);
      for (const line of edge.lines) assert.ok(line.width > 0 && line.height > 0);
    }
  }
  assert.equal(JSON.stringify(matches), original);
  const reversed = buildKnockoutLayout([...matches].reverse(), size);
  assert.deepEqual(reversed, buildKnockoutLayout(matches, size));
}
const incomplete = buildKnockoutLayout(
  [
    { ...blank, id: 1, round: 1, slot: 0 },
    { ...blank, id: 2, round: 2, slot: 0 },
  ],
  size,
);
assert.equal(incomplete.edges.length, 1);
console.log(
  'Passed connected bracket geometry, round alignment, bounds, input preservation, and font-scale layout checks for 2–128 players.',
);

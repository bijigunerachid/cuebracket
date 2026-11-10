const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  ts = require('typescript');
function load(file, req = require) {
  const module = { exports: {} };
  new Function(
    'exports',
    'require',
    'module',
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
  )(module.exports, req, module);
  return module.exports;
}
const engine = load('src/engine.ts');
const rules = load('src/rules.ts', (name) => (name === './engine' ? engine : require(name)));
let seed = 123456789;
const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
for (let count = 2; count <= 128; count++) {
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const original = [...ids];
  for (let iteration = 0; iteration < 16; iteration++) {
    const draw = rules.randomKnockoutDraw(ids, random);
    const s = draw.summary;
    assert.equal(s.byes, 2 ** Math.ceil(Math.log2(count)) - count);
    assert.equal(s.matches, (count - s.byes) / 2);
    assert.equal(s.advancing, s.matches + s.byes);
    assert.deepEqual(
      draw.pairs
        .flatMap((match) => [match.p1, match.p2])
        .filter((id) => id !== null)
        .sort((a, b) => a - b),
      ids,
    );
    assert.ok(draw.pairs.every((match) => match.p1 !== null || match.p2 !== null));
    const manual = engine.assignDrawPlayer(draw.order, 0, ids.at(-1));
    assert.equal(engine.knockoutPairs(manual)[0].p1, ids.at(-1));
    assert.deepEqual(
      [...manual].sort((a, b) => a - b),
      ids,
    );
  }
  assert.deepEqual(ids, original);
}
// Deterministic samples verify broad BYE participation without flaky random tests.
for (const count of [3, 5, 6, 10, 17]) {
  const ids = Array.from({ length: count }, (_, i) => i + 1),
    counts = Array(count).fill(0);
  for (let sample = 0; sample < 2048; sample++)
    for (const match of rules.randomKnockoutDraw(ids, random).pairs)
      if (match.p2 === null) counts[match.p1 - 1]++;
  const expected = (2048 * rules.knockoutSummary(count).byes) / count;
  assert.ok(counts.every((value) => value > expected * 0.5 && value < expected * 1.5));
}
assert.throws(() => rules.randomKnockoutDraw([1, 1]));
assert.throws(() => rules.randomKnockoutDraw([1]));
assert.throws(() => rules.randomKnockoutDraw([1, 2], () => 1));
assert.equal(rules.scoringTarget({ mode: 'first_to', value: 3 }), 3);
assert.equal(rules.scoringTarget({ mode: 'best_of', value: 3 }), 2);
assert.equal(rules.scoringTarget({ mode: 'best_of', value: 5 }), 3);
assert.equal(rules.scoringLabel({ mode: 'first_to', value: 3 }, 'A'), 'A3 · first to 3');
for (const target of [1, 2, 3, 4, 5, 7, 11])
  for (let a = -1; a <= target + 1; a++)
    for (let b = -1; b <= target + 1; b++)
      assert.equal(
        rules.validateTargetScore(a, b, target),
        (a === target && b >= 0 && b < target) || (b === target && a >= 0 && a < target),
      );
for (const value of [0, -1, NaN, Infinity, 1.5])
  assert.throws(() => rules.scoringTarget({ mode: 'first_to', value }));
assert.throws(() => rules.scoringTarget({ mode: 'best_of', value: 4 }));
assert.throws(() => rules.validateScoringOptions({ mode: 'first_to', label: '', rounds: {} }));
assert.throws(() =>
  rules.validateScoringOptions({
    mode: 'first_to',
    label: 'A',
    rounds: { unknown: { mode: 'first_to', value: 3 } },
  }),
);
assert.equal(rules.roundStage(1, 4, 10), 'preliminary');
assert.equal(rules.roundStage(2, 4, 10), 'quarterfinal');
assert.equal(rules.roundStage(3, 4, 10), 'semifinal');
assert.equal(rules.roundStage(4, 4, 10), 'final');
assert.equal(rules.roundStage(1, 3, 5), 'preliminary');
assert.equal(rules.roundStage(1, 1, 2), 'final');
console.log(
  'Passed randomized/manual draws for 2–128 players, BYE distribution samples, score modes/targets, and round-stage checks.',
);

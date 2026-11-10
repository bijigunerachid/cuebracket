const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const moduleObject = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('src/navigation.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
new Function('exports', 'require', 'module', code)(moduleObject.exports, require, moduleObject);
const { parseRouteId, tournamentPath, tournamentRedirect, canScoreMatch } = moduleObject.exports;

for (const invalid of [
  undefined,
  null,
  [],
  ['1'],
  ['1', '2'],
  '',
  '0',
  '-1',
  '01',
  '1.5',
  '1e2',
  ' 1',
  '1 ',
  'NaN',
  'Infinity',
  '9007199254740992',
  1,
]) {
  assert.equal(parseRouteId(invalid), null);
}
assert.equal(parseRouteId('1'), 1);
assert.equal(parseRouteId('123'), 123);
assert.equal(parseRouteId('9007199254740991'), Number.MAX_SAFE_INTEGER);
assert.equal(tournamentPath(12), '/tournament/12');
const setup = { id: 12, status: 'setup' };
const active = { ...setup, status: 'active' };
const complete = { ...setup, status: 'complete' };
for (const view of ['edit', 'players', 'draw']) {
  assert.equal(tournamentRedirect(view, setup, 3), null);
  assert.equal(tournamentRedirect(view, active, 3), '/tournament/12');
  assert.equal(tournamentRedirect(view, complete, 3), '/tournament/12');
}
assert.equal(tournamentRedirect('draw', setup, 0), '/tournament/12/players');
assert.equal(tournamentRedirect('draw', setup, 1), '/tournament/12/players');
assert.equal(tournamentRedirect('draw', setup, 2), null);
assert.equal(tournamentRedirect('results', setup, 3), '/tournament/12');
assert.equal(tournamentRedirect('results', active, 3), '/tournament/12');
assert.equal(tournamentRedirect('results', complete, 3), null);
for (const tournament of [setup, active, complete]) {
  assert.equal(tournamentRedirect('detail', tournament, 0), null);
}
const ready = { tournament_id: 12, status: 'pending', p1: 1, p2: 2 };
assert.equal(canScoreMatch(active, ready), true);
assert.equal(canScoreMatch(setup, ready), false);
assert.equal(canScoreMatch(complete, ready), false);
assert.equal(canScoreMatch(active, undefined), false);
for (const status of ['done', 'bye'])
  assert.equal(canScoreMatch(active, { ...ready, status }), false);
assert.equal(canScoreMatch(active, { ...ready, tournament_id: 99 }), false);
assert.equal(canScoreMatch(active, { ...ready, p1: null }), false);
assert.equal(canScoreMatch(active, { ...ready, p2: null }), false);
console.log(
  'Passed route ID validation, tournament lifecycle redirects, and stale match-link guards.',
);

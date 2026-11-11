const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
let sql;
const adapter = {
  execSync: (query) => sql.exec(query),
  runSync(query, ...params) {
    return { lastInsertRowId: sql.prepare(query).run(...params).lastInsertRowid };
  },
  getAllSync: (query, ...params) => sql.prepare(query).all(...params),
  getFirstSync: (query, ...params) => sql.prepare(query).get(...params) ?? null,
  withTransactionSync(fn) {
    sql.exec('BEGIN');
    try {
      fn();
      sql.exec('COMMIT');
    } catch (error) {
      sql.exec('ROLLBACK');
      throw error;
    }
  },
};
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', 'module', code)(
    module.exports,
    (name) =>
      name === 'expo-sqlite'
        ? { openDatabaseSync: () => adapter }
        : name.startsWith('./')
          ? load(`src/${name.slice(2)}.ts`)
          : require(name),
    module,
  );
  modules.set(file, module.exports);
  return module.exports;
}
const store = load('src/db.ts');
function reset(filename = ':memory:') {
  sql?.close();
  sql = new DatabaseSync(filename);
  store.init();
}
function create(format, count) {
  const id = store.createTournament('Corrections', '8ball', format, 5, {
    mode: 'first_to',
    label: 'A',
    rounds: { final: { mode: 'best_of', value: 7 } },
  });
  for (let i = 0; i < count; i++) store.addPlayer(id, `Player ${i}`);
  store.startTournament(
    id,
    store.participants(id).map((p) => p.id),
  );
  return id;
}
const match = (id, mid) => store.matches(id).find((m) => m.id === mid);
function play(id, m) {
  store.saveResult(id, m.id, m.target, 0);
  return match(id, m.id);
}
function ready(id) {
  return store.matches(id).find((m) => m.status === 'pending' && m.p1 !== null && m.p2 !== null);
}
function finish(id) {
  while (store.tournament(id).status === 'active') {
    const m = ready(id);
    assert.ok(m);
    play(id, m);
  }
}
function change(id, m, first, second) {
  store.correctResult(id, m.id, first, second, m);
  return match(id, m.id);
}

for (const format of ['knockout', 'dynamic_knockout']) {
  for (let count = 2; count <= 128; count++) {
    reset();
    const id = create(format, count);
    const original = play(id, ready(id));
    const corrected = change(id, original, 1, original.target);
    assert.equal(corrected.winner, original.p2);
    const size = store.matches(id).length;
    assert.throws(
      () => store.correctResult(id, original.id, original.target, 0, original),
      /changed/,
    );
    assert.equal(store.matches(id).length, size);
    finish(id);
    const final = store.matches(id).at(-1);
    const flipped = change(id, final, 0, final.target);
    assert.equal(flipped.winner, final.p2);
    assert.equal(store.tournament(id).status, 'complete');
    const before = store.matches(id);
    const earlier = before.find((m) => m.status === 'done' && m.round < final.round);
    if (earlier) {
      // Score-only edits remain safe after descendants have been played.
      const sameWinner = change(
        id,
        earlier,
        earlier.winner === earlier.p1 ? earlier.target : 1,
        earlier.winner === earlier.p2 ? earlier.target : 1,
      );
      assert.equal(sameWinner.winner, earlier.winner);
      const saved = store.matches(id);
      assert.throws(
        () =>
          change(
            id,
            sameWinner,
            sameWinner.winner === sameWinner.p1 ? 0 : sameWinner.target,
            sameWinner.winner === sameWinner.p1 ? sameWinner.target : 0,
          ),
        /later match/,
      );
      assert.deepEqual(store.matches(id), saved);
    }
    store.exportBackup(); // Corrected brackets still satisfy all backup integrity checks.
  }
}
console.log(
  'Passed corrections and completion for knockout/Dynamic Knockout 2–128, final champion changes, stale edits, protected descendants, score-only edits, and backup integrity.',
);

reset();
const branches = create('knockout', 8);
for (const m of store.matches(branches).filter((m) => m.round === 1)) play(branches, m);
const unrelated = play(
  branches,
  store.matches(branches).find((m) => m.round === 2 && m.slot === 1),
);
const source = store.matches(branches).find((m) => m.round === 1 && m.slot === 0);
change(branches, source, 0, source.target);
assert.deepEqual(match(branches, unrelated.id), unrelated);
assert.equal(store.matches(branches).find((m) => m.round === 2 && m.slot === 0).p1, source.p2);
store.exportBackup();

reset();
const id = create('dynamic_knockout', 5);
const originalRandom = Math.random;
Math.random = () => 0;
try {
  const opening = store.matches(id).filter((m) => m.status === 'pending');
  const first = play(id, opening[0]);
  play(id, opening[1]);
  let bye = store.matches(id).find((m) => m.round === 2 && m.status === 'bye');
  assert.equal(bye.winner, first.winner);
  const draw = store.matches(id).map((m) => [m.id, m.round, m.slot]);
  let corrected = change(id, first, 0, first.target);
  bye = match(id, bye.id);
  assert.equal(bye.winner, corrected.winner);
  assert.equal(bye.s1, null);
  assert.equal(bye.s2, null);
  assert.deepEqual(
    store.matches(id).map((m) => [m.id, m.round, m.slot]),
    draw,
  );
  play(id, ready(id)); // The other round-2 match completes; a final is generated.
  corrected = change(id, corrected, corrected.target, 0);
  assert.ok([ready(id).p1, ready(id).p2].includes(corrected.winner));
  // Inject failure after a BYE update to prove that advancement changes also roll back.
  const before = store.matches(id);
  const run = adapter.runSync;
  adapter.runSync = (query, ...params) => {
    const result = run(query, ...params);
    if (query.startsWith('UPDATE matches SET s1=')) throw Error('Injected correction failure');
    return result;
  };
  assert.throws(() => change(id, corrected, 0, corrected.target), /Injected/);
  adapter.runSync = run;
  assert.deepEqual(store.matches(id), before);
  finish(id);
  assert.throws(() => change(id, corrected, 0, corrected.target), /later match/);
  assert.deepEqual(
    store
      .matches(id)
      .filter((m) => m.status === 'bye')
      .map((m) => [m.s1, m.s2]),
    [
      [null, null],
      [null, null],
    ],
  );
  store.exportBackup();
} finally {
  Math.random = originalRandom;
}

reset();
const rr = create('round_robin', 4);
finish(rr);
const rrMatch = store.matches(rr)[0];
const oldStandings = store.standings(rr);
change(rr, rrMatch, 0, rrMatch.target);
assert.equal(
  store.standings(rr).find((r) => r.player.id === rrMatch.p1).wins,
  oldStandings.find((r) => r.player.id === rrMatch.p1).wins - 1,
);
assert.equal(
  store.standings(rr).find((r) => r.player.id === rrMatch.p2).wins,
  oldStandings.find((r) => r.player.id === rrMatch.p2).wins + 1,
);
assert.equal(store.tournament(rr).status, 'complete');
const saved = store.matches(rr);
for (const scores of [
  [-1, 3],
  [3, 3],
  [4, 0],
  [1.5, 3],
  [NaN, 3],
])
  assert.throws(() => change(rr, saved[0], ...scores));
assert.deepEqual(store.matches(rr), saved);
assert.throws(() => store.correctResult(rr + 1, saved[0].id, 3, 0, saved[0]));
const ko = create('knockout', 3);
const bye = store.matches(ko).find((m) => m.status === 'bye');
assert.throws(() => change(ko, bye, 3, 0));
assert.throws(() => change(ko, ready(ko), 3, 0));
console.log(
  'Passed dynamic BYE propagation without reshuffling, downstream rollback, round-robin standings, invalid scores, wrong tournaments, and BYE/pending rejection.',
);

const filename = path.join(os.tmpdir(), `cuebracket-corrections-${randomUUID()}.db`);
try {
  reset(filename);
  const disk = create('knockout', 4);
  const m = play(disk, ready(disk));
  change(disk, m, 0, m.target);
  const before = store.matches(disk);
  reset(filename);
  assert.deepEqual(store.matches(disk), before);
  finish(disk);
  store.exportBackup();
} finally {
  sql.close();
  sql = null;
  fs.unlinkSync(filename);
}
console.log('Passed file-backed SQLite restart after correction and continued tournament play.');

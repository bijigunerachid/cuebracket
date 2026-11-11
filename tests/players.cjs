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
function event(name = 'Source', format = 'knockout') {
  return store.createTournament(name, 'snooker', format, 5);
}
function finish(id) {
  while (store.tournament(id).status === 'active') {
    const m = store.matches(id).find((m) => m.status === 'pending' && m.p1 && m.p2);
    assert.ok(m);
    store.saveResult(id, m.id, m.target, 0);
  }
}
reset();
const source = event();
for (const name of ['Rachid', 'Nadia', 'عبد الرحيم', 'Élodie']) store.addPlayer(source, name);
store.startTournament(
  source,
  store.participants(source).map((p) => p.id),
);
finish(source);
const sourcePlayers = store.participants(source);
const original = {
  tournament: store.tournament(source),
  players: sourcePlayers,
  matches: store.matches(source),
};
const repeated = event('Duplicate source');
store.addPlayer(repeated, 'RACHID');
const target = event('Target');
assert.equal(store.reusablePlayers(target).length, 4);
assert.throws(() => store.reusablePlayers(999999));
store.addPlayer(target, 'nadia');
assert.equal(store.reusablePlayers(target).length, 3);
const selected = sourcePlayers.filter((p) => p.name !== 'Nadia').map((p) => p.id);
store.registerReturningPlayers(target, selected);
assert.deepEqual(
  store.participants(target).map((p) => p.name),
  ['nadia', 'Rachid', 'عبد الرحيم', 'Élodie'],
);
assert.ok(store.participants(target).every((p) => !sourcePlayers.some((old) => old.id === p.id)));
assert.equal(store.reusablePlayers(target).length, 0);
const copy = store.participants(target).find((p) => p.name === 'Rachid');
store.renamePlayer(target, copy.id, 'Rachid local');
assert.deepEqual(
  {
    tournament: store.tournament(source),
    players: store.participants(source),
    matches: store.matches(source),
  },
  original,
);
assert.throws(
  () => store.registerReturningPlayers(target, [sourcePlayers[1].id]),
  /already registered/,
);
const unchanged = store.participants(target);
for (const ids of [[], [selected[0], selected[0]], [NaN], [0], [999999], [selected[0], 999999]])
  assert.throws(() => store.registerReturningPlayers(target, ids));
assert.deepEqual(store.participants(target), unchanged);
const otherRachid = store.participants(repeated)[0];
const blank = event('Blank');
assert.throws(
  () => store.registerReturningPlayers(blank, [sourcePlayers[0].id, otherRachid.id]),
  /already registered/,
);
assert.equal(store.participants(blank).length, 0);
const run = adapter.runSync;
let inserts = 0;
adapter.runSync = (query, ...params) => {
  const result = run(query, ...params);
  if (query.startsWith('INSERT INTO tournament_players') && ++inserts === 2)
    throw Error('Injected batch failure');
  return result;
};
const before = store.allPlayers();
assert.throws(() => store.registerReturningPlayers(blank, selected), /Injected/);
adapter.runSync = run;
assert.deepEqual(store.allPlayers(), before);
assert.equal(store.participants(blank).length, 0);
store.removePlayer(target, store.participants(target)[1].id);
store.registerReturningPlayers(target, [sourcePlayers[0].id]);
assert.equal(
  new Set(
    sql
      .prepare('SELECT position FROM tournament_players WHERE tournament_id=?')
      .all(target)
      .map((r) => r.position),
  ).size,
  store.participants(target).length,
);
for (const format of ['knockout', 'round_robin', 'dynamic_knockout']) {
  const id = event(format, format);
  store.registerReturningPlayers(id, selected);
  store.startTournament(
    id,
    store.participants(id).map((p) => p.id),
  );
  assert.throws(() => store.registerReturningPlayers(id, [sourcePlayers[1].id]), /setup/);
  finish(id);
  assert.throws(() => store.registerReturningPlayers(id, [sourcePlayers[1].id]), /setup/);
}
store.exportBackup();
const backup = store.exportBackup();
store.importBackup(backup);
store.exportBackup();
assert.deepEqual(store.participants(source), sourcePlayers);
console.log(
  'Passed distinct returning names, case-insensitive duplicate prevention, Unicode, independent IDs/renaming, source history preservation, atomic rollback, slot ordering, format lifecycle locks, and backup compatibility.',
);

reset();
const large = event('128 source');
for (let i = 0; i < 128; i++) store.addPlayer(large, `Player ${i}`);
const ids = store.participants(large).map((p) => p.id);
const dynamic = event('Dynamic limit', 'dynamic_knockout');
store.addPlayer(dynamic, 'Already here');
assert.throws(() => store.registerReturningPlayers(dynamic, ids), /128/);
assert.equal(store.participants(dynamic).length, 1);
store.registerReturningPlayers(dynamic, ids.slice(0, 127));
assert.equal(store.participants(dynamic).length, 128);
assert.throws(() => store.registerReturningPlayers(dynamic, ids.slice(127)), /128/);
store.startTournament(
  dynamic,
  store.participants(dynamic).map((p) => p.id),
);
finish(dynamic);
store.exportBackup();
console.log(
  'Passed atomic Dynamic Knockout 128-player limit checks and complete play after bulk registration.',
);

const filename = path.join(os.tmpdir(), `cuebracket-players-${randomUUID()}.db`);
try {
  reset(filename);
  const source = event('Persisted source');
  store.addPlayer(source, 'Returning player');
  const target = event('Persisted target');
  store.registerReturningPlayers(target, [store.participants(source)[0].id]);
  const before = store.participants(target);
  reset(filename);
  assert.deepEqual(store.participants(target), before);
  assert.equal(store.reusablePlayers(target).length, 0);
} finally {
  sql.close();
  fs.unlinkSync(filename);
}
console.log('Passed real SQLite close/reopen with reused registrations.');

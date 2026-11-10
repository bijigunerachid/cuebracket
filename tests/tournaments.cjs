const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

function load(file, requireModule = require) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', 'module', code)(module.exports, requireModule, module);
  return module.exports;
}
const engine = load('src/engine.ts');
const sql = new DatabaseSync(':memory:');
const adapter = {
  execSync: (query) => sql.exec(query),
  runSync(query, ...params) {
    const result = sql.prepare(query).run(...params);
    return { ...result, lastInsertRowId: result.lastInsertRowid };
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
const store = load('src/db.ts', (name) =>
  name === 'expo-sqlite'
    ? { openDatabaseSync: () => adapter }
    : name === './engine'
      ? engine
      : require(name),
);
// Simulate the unversioned schema already installed on an organizer's device.
const schema = fs.readFileSync('src/db.ts', 'utf8').match(/db\.execSync\(`([\s\S]*?)`\)/)[1];
sql.exec(schema);
sql.exec(`INSERT INTO tournaments(id,name,game,format,best_of,status) VALUES(1,'Legacy','8ball','knockout',5,'complete');
 INSERT INTO players(id,name) VALUES(1,'A'),(2,'B');
 INSERT INTO tournament_players VALUES(1,1,2),(1,2,2);
 INSERT INTO matches(tournament_id,round,slot,p1,p2,s1,s2,winner,status) VALUES(1,1,0,1,2,3,1,1,'done');`);
store.init();
assert.deepEqual(
  sql
    .prepare('SELECT position FROM tournament_players ORDER BY player_id')
    .all()
    .map((r) => r.position),
  [0, 1],
);
assert.equal(store.matches(1)[0].winner, 1);
store.init();
assert.equal(store.matches(1)[0].s1, 3);
assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 1);
assert.throws(() => sql.prepare('UPDATE matches SET winner=999 WHERE tournament_id=1').run());
assert.equal(store.matches(1)[0].winner, 1);
store.deleteTournament(1);

for (const best of [0, -1, 2, 1.5, NaN, Infinity]) {
  assert.throws(() => store.createTournament('Bad', '8ball', 'knockout', best));
  assert.equal(engine.validateScore(1, 0, best), false);
}
assert.throws(() => store.createTournament('Bad', 'invalid', 'knockout', 5));
assert.throws(() => store.createTournament('Bad', '8ball', 'invalid', 5));
assert.throws(() =>
  sql.exec(
    "INSERT INTO tournaments(name,game,format,best_of) VALUES('Bad','invalid','knockout',5)",
  ),
);
const orderingId = store.createTournament('Ordering', 'snooker', 'knockout', 3);
for (const name of ['A', 'B', 'C']) store.addPlayer(orderingId, name);
store.removePlayer(orderingId, store.participants(orderingId)[1].id);
store.addPlayer(orderingId, 'D');
assert.deepEqual(
  store.participants(orderingId).map((p) => p.name),
  ['A', 'C', 'D'],
);
assert.throws(() => store.addPlayer(orderingId, 'a'));
assert.equal(store.participants(orderingId).length, 3);
store.deleteTournament(orderingId);
assert.equal(store.allPlayers().length, 0);

const editId = store.createTournament('Player editing', '8ball', 'knockout', 3);
for (const name of ['Alice', 'Bob']) store.addPlayer(editId, name);
const originalPlayers = store.participants(editId);
const alice = originalPlayers[0].id,
  bob = originalPlayers[1].id;
const originalPositions = sql
  .prepare(
    'SELECT player_id,position FROM tournament_players WHERE tournament_id=? ORDER BY position',
  )
  .all(editId);
store.renamePlayer(editId, alice, '  Alicia  ');
assert.deepEqual(
  store.participants(editId).map((p) => [p.id, p.name]),
  [
    [alice, 'Alicia'],
    [bob, 'Bob'],
  ],
);
assert.deepEqual(
  sql
    .prepare(
      'SELECT player_id,position FROM tournament_players WHERE tournament_id=? ORDER BY position',
    )
    .all(editId),
  originalPositions,
);
store.init();
assert.equal(store.participants(editId)[0].name, 'Alicia');
store.renamePlayer(editId, alice, 'ALICIA');
for (const name of ['', '   ', ' bob ', 'BOB'])
  assert.throws(() => store.renamePlayer(editId, alice, name));
assert.equal(store.participants(editId)[0].name, 'ALICIA');
assert.throws(() => store.renamePlayer(editId, 999999, 'Unknown'), /not registered/);
assert.throws(() => store.renamePlayer(999999, alice, 'Wrong event'), /not found/);
const otherId = store.createTournament('Other event', 'snooker', 'knockout', 3);
store.addPlayer(otherId, 'Other');
const other = store.participants(otherId)[0];
assert.throws(() => store.renamePlayer(editId, other.id, 'Wrong player'), /not registered/);
assert.equal(store.participants(otherId)[0].name, 'Other');
// Protect shared legacy profiles from changing another tournament's names.
sql.prepare('INSERT INTO tournament_players VALUES(?,?,?)').run(otherId, alice, 1);
assert.throws(() => store.renamePlayer(editId, alice, 'Shared edit'), /cannot be renamed/);
assert.equal(store.participants(editId)[0].name, 'ALICIA');
sql
  .prepare('DELETE FROM tournament_players WHERE tournament_id=? AND player_id=?')
  .run(otherId, alice);
const runBeforeRename = adapter.runSync;
adapter.runSync = (query, ...params) => {
  const result = runBeforeRename(query, ...params);
  if (query.startsWith('UPDATE players SET name=')) throw Error('Simulated rename failure');
  return result;
};
assert.throws(() => store.renamePlayer(editId, alice, 'Rolled back'), /Simulated rename failure/);
adapter.runSync = runBeforeRename;
assert.equal(store.participants(editId)[0].name, 'ALICIA');
store.startTournament(editId, [alice, bob]);
const drawBeforeEdit = store.matches(editId);
assert.throws(() => store.renamePlayer(editId, alice, 'Active edit'), /already started/);
assert.deepEqual(store.matches(editId), drawBeforeEdit);
store.saveResult(editId, drawBeforeEdit[0].id, 2, 0);
const resultsBeforeEdit = store.matches(editId);
assert.throws(() => store.renamePlayer(editId, alice, 'History edit'), /already started/);
assert.deepEqual(store.matches(editId), resultsBeforeEdit);
assert.equal(store.participants(editId)[0].name, 'ALICIA');
store.removePlayer(otherId, other.id);
assert.throws(() => store.renamePlayer(otherId, other.id, 'Removed'), /not registered/);
store.deleteTournament(otherId);
store.deleteTournament(editId);

const tied = [
  { wins: 2, diff: 3 },
  { wins: 2, diff: 3 },
  { wins: 2, diff: 1 },
];
assert.equal(engine.tiedLeaders(tied).length, 2);
assert.equal(engine.tiedLeaders(tied.slice(1)).length, 1);
assert.deepEqual(engine.tiedLeaders([]), []);

const tieId = store.createTournament('Three-way tie', 'snooker', 'round_robin', 3);
for (const name of ['A', 'B', 'C']) store.addPlayer(tieId, name);
const tiePlayers = store.participants(tieId).map((p) => p.id);
store.startTournament(tieId, tiePlayers);
const firstMatch = store.matches(tieId)[0];
const realRun = adapter.runSync;
adapter.runSync = (query, ...params) => {
  if (query.startsWith('UPDATE matches SET winner=')) throw Error('Simulated storage failure');
  return realRun(query, ...params);
};
assert.throws(() => store.saveResult(tieId, firstMatch.id, 2, 0), /Simulated storage failure/);
adapter.runSync = realRun;
assert.equal(store.matches(tieId)[0].s1, null);
assert.equal(store.matches(tieId)[0].status, 'pending');
for (const match of store.matches(tieId)) {
  const first = tiePlayers.indexOf(match.p1),
    second = tiePlayers.indexOf(match.p2);
  const firstWins = (first + 1) % 3 === second;
  store.saveResult(tieId, match.id, firstWins ? 2 : 0, firstWins ? 0 : 2);
}
assert.equal(store.tournament(tieId).status, 'complete');
assert.equal(engine.tiedLeaders(store.standings(tieId)).length, 3);
store.deleteTournament(tieId);

assert.deepEqual(engine.assignDrawPlayer([1, 2, 3, 4], 1, 4), [1, 4, 3, 2]);
assert.deepEqual(engine.assignDrawPlayer([1, 2, 3, 4], 1, 2), [1, 2, 3, 4]);
assert.throws(() => engine.assignDrawPlayer([1, 2], -1, 1));
assert.throws(() => engine.assignDrawPlayer([1, 2], 2, 1));
assert.throws(() => engine.assignDrawPlayer([1, 2], 0.5, 1));
assert.throws(() => engine.assignDrawPlayer([1, 2], 0, 999));
assert.throws(() => engine.assignDrawPlayer([1, 1], 0, 1));

// Verify explicit opponent and BYE choices survive SQLite draw creation.
for (const format of ['knockout', 'round_robin'])
  for (const count of [2, 3, 5, 6, 7, 8, 9]) {
    const tid = store.createTournament('Manual draw', '8ball', format, 3);
    for (let i = 0; i < count; i++) store.addPlayer(tid, `Manual ${i}`);
    const initial = store.participants(tid).map((p) => p.id);
    assert.throws(() => store.startTournament(tid, [initial[0], ...initial.slice(0, -1)]));
    assert.equal(store.matches(tid).length, 0);
    const order = engine.assignDrawPlayer(initial, 0, initial[count - 1]);
    const expected =
      format === 'knockout' ? engine.knockoutPairs(order) : engine.roundRobinPairs(order);
    store.startTournament(tid, order);
    const actual = store.matches(tid).filter((m) => format === 'round_robin' || m.round === 1);
    assert.deepEqual(
      actual.map((m) => [m.round, m.slot, m.p1, m.p2]),
      expected.map((m) => [m.round, m.slot, m.p1, m.p2]),
    );
    if (format === 'knockout' && count !== 2 ** Math.ceil(Math.log2(count))) {
      assert.equal(actual[0].p1, initial[count - 1]);
      assert.equal(actual[0].status, 'bye');
      assert.equal(actual[0].winner, initial[count - 1]);
    }
    const confirmed = store.matches(tid);
    assert.throws(() => store.startTournament(tid, initial));
    assert.deepEqual(store.matches(tid), confirmed);
    store.deleteTournament(tid);
  }

for (let count = 2; count <= 128; count++) {
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  let manual = [...ids];
  for (let position = 0; position < count; position++) {
    const previous = manual;
    const before = [...previous];
    manual = engine.assignDrawPlayer(manual, position, ids[count - position - 1]);
    assert.deepEqual(previous, before);
    assert.deepEqual(
      before.slice().sort((a, b) => a - b),
      ids,
    );
    assert.equal(manual[position], ids[count - position - 1]);
    assert.notEqual(manual, previous);
    assert.deepEqual(
      manual.slice().sort((a, b) => a - b),
      ids,
    );
  }
  const pairs = engine.knockoutPairs(ids);
  assert.equal(pairs.length, 2 ** Math.ceil(Math.log2(count)) / 2);
  assert.ok(pairs.every((m) => m.p1 !== null || m.p2 !== null));
  assert.equal(
    pairs.filter((m) => m.p1 === null || m.p2 === null).length,
    2 ** Math.ceil(Math.log2(count)) - count,
  );
  assert.deepEqual(
    pairs
      .flatMap((m) => [m.p1, m.p2])
      .filter((x) => x !== null)
      .sort((a, b) => a - b),
    ids,
  );
  const schedule = engine.roundRobinPairs(ids);
  assert.equal(schedule.length, (count * (count - 1)) / 2);
  assert.equal(
    new Set(schedule.map((m) => [m.p1, m.p2].sort((a, b) => a - b).join(':'))).size,
    schedule.length,
  );
  for (const round of new Set(schedule.map((m) => m.round))) {
    const players = schedule.filter((m) => m.round === round).flatMap((m) => [m.p1, m.p2]);
    assert.equal(new Set(players).size, players.length);
  }
}

for (const format of ['knockout', 'round_robin']) {
  for (const path of ['first', 'second', 'alternating']) {
    for (let count = 2; count <= 32; count++) {
      const id = store.createTournament('Regression', '8ball', format, 5);
      for (let i = 0; i < count; i++) store.addPlayer(id, `Player ${i}`);
      const ids = store.participants(id).map((p) => p.id);
      assert.throws(() => store.startTournament(id, ids.slice(1)));
      assert.equal(store.matches(id).length, 0);
      store.startTournament(id, ids);
      let played = 0;
      while (true) {
        const match = store
          .matches(id)
          .find((m) => m.status === 'pending' && m.p1 !== null && m.p2 !== null);
        if (!match) break;
        const firstWins = path === 'first' || (path === 'alternating' && played % 2 === 0);
        store.saveResult(id, match.id, firstWins ? 3 : 1, firstWins ? 1 : 3);
        assert.throws(() => store.saveResult(id, match.id, 3, 0));
        played++;
      }
      assert.equal(store.tournament(id).status, 'complete', `${format}: ${count}, ${path}`);
      assert.equal(played, format === 'knockout' ? count - 1 : (count * (count - 1)) / 2);
      assert.ok(store.matches(id).every((m) => m.status !== 'pending'));
      store.deleteTournament(id);
      assert.equal(store.matches(id).length, 0);
    }
  }
}
for (const best of [3, 5, 7, 9]) {
  const target = engine.winsNeeded(best);
  for (let a = -1; a <= best + 1; a++)
    for (let b = -1; b <= best + 1; b++) {
      assert.equal(
        engine.validateScore(a, b, best),
        (a === target && b >= 0 && b < target) || (b === target && a >= 0 && a < target),
      );
    }
}
sql.close();
console.log(
  'Passed manual assignment and persistence checks, player editing and rollback checks, migration preservation, constraints, ordering, ties, pairing checks for 2–128 players, 186 tournament simulations, and score validation.',
);

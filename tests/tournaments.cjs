const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');
const compiledModules = new Map();

function load(file, requireModule = require) {
  const module = { exports: {} };
  const code =
    compiledModules.get(file) ??
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
  compiledModules.set(file, code);
  new Function('exports', 'require', 'module', code)(module.exports, requireModule, module);
  return module.exports;
}
const engine = load('src/engine.ts');
const rules = load('src/rules.ts', (name) => (name === './engine' ? engine : require(name)));
const migrations = load('src/migrations.ts');
const bracket = load('src/bracket.ts');
let sql = new DatabaseSync(':memory:');
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
      : name === './rules'
        ? rules
        : name === './migrations'
          ? migrations
          : require(name),
);
// Simulate the unversioned schema already installed on an organizer's device.
const schema = fs.readFileSync('src/db.ts', 'utf8').match(/db\.execSync\(`([\s\S]*?)`\)/)[1];
sql.exec(schema);
sql.exec(`INSERT INTO tournaments(id,name,game,format,best_of,status) VALUES(1,'Legacy','8ball','knockout',5,'complete');
 INSERT INTO players(id,name) VALUES(1,'A'),(2,'B');
 INSERT INTO tournament_players VALUES(1,1,2),(1,2,2);
 INSERT INTO matches(tournament_id,round,slot,p1,p2,s1,s2,winner,status) VALUES(1,1,0,1,2,3,1,1,'done');`);
const originalExec = adapter.execSync;
adapter.execSync = (query) => {
  originalExec(query);
  if (query.includes('ALTER TABLE tournaments ADD COLUMN scoring_mode'))
    throw Error('Simulated migration failure');
};
assert.throws(() => store.init(), /Simulated migration failure/);
adapter.execSync = originalExec;
assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 1);
assert.ok(
  !sql
    .prepare('PRAGMA table_info(tournaments)')
    .all()
    .some((column) => column.name === 'scoring_mode'),
);
assert.equal(sql.prepare('SELECT s1 FROM matches').get().s1, 3);
// Retry from a genuine version-1 schema and fail while rebuilding the last trigger.
adapter.execSync = (query) => {
  originalExec(query);
  if (
    query.includes('CREATE TRIGGER') &&
    query.includes('validate_matches_update') &&
    query.includes('NEW.target')
  )
    throw Error('Simulated trigger migration failure');
};
assert.throws(() => store.init(), /Simulated trigger migration failure/);
adapter.execSync = originalExec;
assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 1);
assert.ok(
  !sql
    .prepare('PRAGMA table_info(matches)')
    .all()
    .some((column) => column.name === 'target'),
);
adapter.execSync = (query) => {
  originalExec(query);
  if (
    query.includes('CREATE TRIGGER') &&
    query.includes('validate_tournaments_update') &&
    query.includes('dynamic_knockout')
  )
    throw Error('Simulated dynamic migration failure');
};
assert.throws(() => store.init(), /Simulated dynamic migration failure/);
adapter.execSync = originalExec;
assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 2);
assert.equal(store.matches(1)[0].winner, 1);
store.init();
assert.equal(store.matches(1)[0].target, 3);
assert.equal(store.matches(1)[0].scoring_mode, 'best_of');
assert.equal(store.matches(1)[0].scoring_value, 5);
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
assert.equal(sql.prepare('PRAGMA user_version').get().user_version, 3);
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
const configurationId = store.createTournament('Original settings', '8ball', 'knockout', 3);
for (const name of ['Config A', 'Config B', 'Config C']) store.addPlayer(configurationId, name);
const originalConfiguration = store.tournament(configurationId);
const configurationPlayers = store.participants(configurationId);
const configurationRegistrations = sql
  .prepare('SELECT * FROM tournament_players WHERE tournament_id=? ORDER BY position')
  .all(configurationId);
store.updateTournament(configurationId, '  Updated settings  ', 'snooker', 'round_robin', 7);
const updatedConfiguration = store.tournament(configurationId);
assert.equal(updatedConfiguration.name, 'Updated settings');
assert.equal(updatedConfiguration.game, 'snooker');
assert.equal(updatedConfiguration.format, 'round_robin');
assert.equal(updatedConfiguration.best_of, 7);
assert.equal(updatedConfiguration.id, originalConfiguration.id);
assert.equal(updatedConfiguration.created_at, originalConfiguration.created_at);
assert.equal(updatedConfiguration.status, 'setup');
assert.deepEqual(store.participants(configurationId), configurationPlayers);
assert.deepEqual(
  sql
    .prepare('SELECT * FROM tournament_players WHERE tournament_id=? ORDER BY position')
    .all(configurationId),
  configurationRegistrations,
);
assert.equal(store.matches(configurationId).length, 0);
store.init();
assert.deepEqual(store.tournament(configurationId), updatedConfiguration);
for (const name of ['', '   ']) {
  assert.throws(() => store.updateTournament(configurationId, name, '8ball', 'knockout', 5));
}
for (const best of [0, -1, 2, 1.5, NaN, Infinity]) {
  assert.throws(() =>
    store.updateTournament(configurationId, 'Invalid', '8ball', 'knockout', best),
  );
}
assert.throws(() => store.updateTournament(configurationId, 'Invalid', 'invalid', 'knockout', 5));
assert.throws(() => store.updateTournament(configurationId, 'Invalid', '8ball', 'invalid', 5));
assert.deepEqual(store.tournament(configurationId), updatedConfiguration);
assert.throws(() => store.updateTournament(999999, 'Missing', '8ball', 'knockout', 5), /not found/);

const runBeforeConfiguration = adapter.runSync;
adapter.runSync = (query, ...params) => {
  const result = runBeforeConfiguration(query, ...params);
  if (query.startsWith('UPDATE tournaments SET name=')) throw Error('Simulated settings failure');
  return result;
};
assert.throws(
  () => store.updateTournament(configurationId, 'Rolled back', '8ball', 'knockout', 9),
  /Simulated settings failure/,
);
adapter.runSync = runBeforeConfiguration;
assert.deepEqual(store.tournament(configurationId), updatedConfiguration);

// Preserve a legacy setup event that already contains match records.
sql
  .prepare('INSERT INTO matches(tournament_id,round,slot) VALUES(?,?,?)')
  .run(configurationId, 1, 0);
assert.throws(
  () => store.updateTournament(configurationId, 'Do not overwrite draw', '8ball', 'knockout', 5),
  /draw already exists/,
);
assert.deepEqual(store.tournament(configurationId), updatedConfiguration);
assert.equal(store.matches(configurationId).length, 1);
sql.prepare('DELETE FROM matches WHERE tournament_id=?').run(configurationId);
store.startTournament(
  configurationId,
  configurationPlayers.map((player) => player.id),
);
const configuredSchedule = store.matches(configurationId);
assert.equal(configuredSchedule.length, 3);
const activeConfiguration = store.tournament(configurationId);
assert.throws(
  () => store.updateTournament(configurationId, 'Active edit', '8ball', 'knockout', 3),
  /locked after starting/,
);
assert.deepEqual(store.tournament(configurationId), activeConfiguration);
assert.deepEqual(store.matches(configurationId), configuredSchedule);
assert.throws(() => store.saveResult(configurationId, configuredSchedule[0].id, 2, 0));
assert.deepEqual(store.matches(configurationId), configuredSchedule);
for (const match of configuredSchedule) store.saveResult(configurationId, match.id, 4, 1);
const completedConfiguration = store.tournament(configurationId);
const completedMatches = store.matches(configurationId);
assert.equal(completedConfiguration.status, 'complete');
assert.throws(
  () => store.updateTournament(configurationId, 'Completed edit', '8ball', 'knockout', 3),
  /locked after starting/,
);
assert.deepEqual(store.tournament(configurationId), completedConfiguration);
assert.deepEqual(store.matches(configurationId), completedMatches);
store.deleteTournament(configurationId);

const knockoutConfigurationId = store.createTournament(
  'Change to knockout',
  'snooker',
  'round_robin',
  5,
);
store.updateTournament(knockoutConfigurationId, 'Knockout settings', '8ball', 'knockout', 1);
for (const name of ['K1', 'K2', 'K3']) store.addPlayer(knockoutConfigurationId, name);
store.startTournament(
  knockoutConfigurationId,
  store.participants(knockoutConfigurationId).map((player) => player.id),
);
assert.equal(store.matches(knockoutConfigurationId).length, 3);
assert.equal(
  store.matches(knockoutConfigurationId).filter((match) => match.status === 'bye').length,
  1,
);
while (true) {
  const match = store
    .matches(knockoutConfigurationId)
    .find(
      (candidate) =>
        candidate.status === 'pending' && candidate.p1 !== null && candidate.p2 !== null,
    );
  if (!match) break;
  store.saveResult(knockoutConfigurationId, match.id, 1, 0);
}
assert.equal(store.tournament(knockoutConfigurationId).status, 'complete');
store.deleteTournament(knockoutConfigurationId);

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
      if (format === 'knockout') {
        const completed = store.matches(id);
        const layout = bracket.buildKnockoutLayout(completed, {
          cardWidth: 260,
          cardHeight: 192,
          columnGap: 48,
          rowGap: 24,
        });
        for (const edge of layout.edges) {
          const source = completed.find((match) => match.id === edge.from);
          const target = completed.find((match) => match.id === edge.to);
          assert.equal(source.slot % 2 === 0 ? target.p1 : target.p2, source.winner);
        }
      }
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
// Real persisted draws and round-specific scoring for every knockout size 2–128.
const stageRules = {
  preliminary: { mode: 'first_to', value: 2 },
  quarterfinal: { mode: 'best_of', value: 5 },
  semifinal: { mode: 'first_to', value: 4 },
  final: { mode: 'best_of', value: 11 },
};
for (let count = 2; count <= 128; count++) {
  const tid = store.createTournament(`Rules ${count}`, '8ball', 'knockout', 7, {
    mode: 'first_to',
    label: 'A',
    rounds: stageRules,
  });
  for (let i = 0; i < count; i++) store.addPlayer(tid, `P${i}`);
  const ids = store.participants(tid).map((player) => player.id);
  const preview = rules.randomKnockoutDraw(ids);
  store.startTournament(tid, preview.order);
  const opening = store.matches(tid).filter((match) => match.round === 1);
  assert.deepEqual(
    opening.map((match) => [match.p1, match.p2]),
    preview.pairs.map((match) => [match.p1, match.p2]),
  );
  assert.equal(opening.filter((match) => match.status === 'bye').length, preview.summary.byes);
  for (const match of opening.filter((match) => match.status === 'bye')) {
    assert.equal(match.s1, null);
    assert.equal(match.s2, null);
    assert.equal(match.winner, match.p1 ?? match.p2);
    assert.throws(() => store.saveResult(tid, match.id, match.target, 0));
  }
  let played = 0;
  while (true) {
    const match = store
      .matches(tid)
      .find((row) => row.status === 'pending' && row.p1 !== null && row.p2 !== null);
    if (!match) break;
    const expected = rules.ruleForRound(
      store.tournament(tid),
      match.round,
      preview.summary.rounds,
      count,
    );
    assert.equal(match.target, rules.scoringTarget(expected));
    assert.equal(match.scoring_mode, expected.mode);
    assert.equal(match.scoring_value, expected.value);
    assert.throws(() => store.saveResult(tid, match.id, match.target + 1, 0));
    assert.throws(() => store.saveResult(tid, match.id, match.target, match.target));
    const secondWins = played % 2 === 1;
    store.saveResult(tid, match.id, secondWins ? 0 : match.target, secondWins ? match.target : 0);
    played++;
  }
  assert.equal(played, count - 1);
  assert.equal(store.tournament(tid).status, 'complete');
  const all = store.matches(tid);
  assert.ok(all.every((match) => match.status !== 'pending'));
  const final = all.find((match) => match.round === preview.summary.rounds);
  assert.ok(ids.includes(final.winner));
  assert.equal(final.target, 6);
  store.deleteTournament(tid);
}
const configuredRules = store.createTournament('Editable rules', 'snooker', 'knockout', 5);
store.updateTournament(configuredRules, 'A5 event', '8ball', 'knockout', 9, {
  mode: 'first_to',
  label: 'A',
  rounds: stageRules,
});
assert.equal(store.tournament(configuredRules).scoring_mode, 'first_to');
assert.equal(store.tournament(configuredRules).first_to_label, 'A');
assert.deepEqual(JSON.parse(store.tournament(configuredRules).round_rules), stageRules);
const savedRules = store.tournament(configuredRules);
assert.throws(() =>
  store.updateTournament(configuredRules, 'Invalid', '8ball', 'knockout', 9, {
    mode: 'first_to',
    label: 'A',
    rounds: { final: { mode: 'best_of', value: 4 } },
  }),
);
assert.deepEqual(store.tournament(configuredRules), savedRules);
store.init();
assert.deepEqual(store.tournament(configuredRules), savedRules);
store.deleteTournament(configuredRules);
const rr = store.createTournament('First-to RR', 'snooker', 'round_robin', 9, {
  mode: 'first_to',
  label: 'A',
  rounds: stageRules,
});
for (const name of ['A', 'B', 'C']) store.addPlayer(rr, name);
store.startTournament(
  rr,
  store.participants(rr).map((player) => player.id),
);
assert.ok(
  store.matches(rr).every((match) => match.target === 5 && match.scoring_mode === 'first_to'),
);
// Saved match targets stay authoritative even if external metadata is changed.
sql.prepare('UPDATE tournaments SET best_of=3 WHERE id=?').run(rr);
assert.ok(
  store
    .matches(rr)
    .every(
      (match) => match.target === 5 && rules.ruleForMatch(store.tournament(rr), match).value === 5,
    ),
);
for (const match of store.matches(rr)) store.saveResult(rr, match.id, 5, 1);
assert.equal(store.tournament(rr).status, 'complete');
store.deleteTournament(rr);
assert.throws(() =>
  store.createTournament('Bad rules', '8ball', 'knockout', 5, {
    mode: 'first_to',
    label: 'A',
    rounds: { final: { mode: 'best_of', value: 4 } },
  }),
);
assert.throws(() =>
  sql.exec(
    "INSERT INTO tournaments(name,game,format,best_of,scoring_mode) VALUES('Bad','8ball','knockout',5,'invalid')",
  ),
);
assert.throws(() =>
  sql.exec(
    "INSERT INTO tournaments(name,game,format,best_of,round_rules) VALUES('Bad','8ball','knockout',5,'[]')",
  ),
);
// Dynamic rounds persist independently of the JavaScript module lifetime.
function reopenStore() {
  const reopened = load('src/db.ts', (name) =>
    name === 'expo-sqlite'
      ? { openDatabaseSync: () => adapter }
      : name === './engine'
        ? engine
        : name === './rules'
          ? rules
          : name === './migrations'
            ? migrations
            : require(name),
  );
  reopened.init();
  return reopened;
}
for (const count of [0, 1, 129, 1.5, NaN, Infinity])
  assert.throws(() => engine.dynamicSummary(count));
assert.throws(() => engine.dynamicPairs([1, 1]));
assert.throws(() => engine.dynamicPairs([1, -2]));
for (let count = 2; count <= 128; count++) {
  let session = reopenStore();
  const tid = session.createTournament(
    `Dynamic ${count}`,
    count % 2 ? 'snooker' : '8ball',
    'dynamic_knockout',
    5,
    {
      mode: count % 2 ? 'first_to' : 'best_of',
      label: 'A',
      rounds: { final: { mode: 'first_to', value: 5 } },
    },
  );
  for (let index = 0; index < count; index++) session.addPlayer(tid, `D${index}`);
  if (count === 128) assert.throws(() => session.addPlayer(tid, 'Overflow'), /128/);
  const registered = session.participants(tid).map((player) => player.id);
  const order = engine.assignDrawPlayer(engine.shuffle(registered), 0, registered[0]);
  session.startTournament(tid, order);
  assert.throws(() => session.startTournament(tid, order));
  assert.deepEqual(
    session.matches(tid).map((m) => [m.p1, m.p2]),
    engine.dynamicPairs(order).map((m) => [m.p1, m.p2]),
  );
  let active = [...registered],
    round = 1,
    played = 0;
  while (active.length > 1) {
    let current = session.matches(tid).filter((m) => m.round === round);
    assert.equal(
      session.matches(tid).some((m) => m.round > round),
      false,
    );
    const ids = current.flatMap((m) => [m.p1, m.p2]).filter((id) => id !== null);
    assert.equal(new Set(ids).size, active.length);
    assert.deepEqual(
      [...ids].sort((a, b) => a - b),
      [...active].sort((a, b) => a - b),
    );
    assert.equal(current.filter((m) => m.status === 'bye').length, active.length % 2);
    const pending = current.filter((m) => m.status === 'pending');
    assert.equal(pending.length, Math.floor(active.length / 2));
    for (const m of current.filter((m) => m.status === 'bye')) {
      assert.equal(m.s1, null);
      assert.equal(m.s2, null);
      assert.equal(m.winner, m.p1);
      assert.throws(() => session.saveResult(tid, m.id, m.target, 0));
    }
    for (let index = 0; index < pending.length; index++) {
      const match = pending[index];
      assert.throws(() => session.saveResult(tid, match.id, match.target + 1, 0));
      assert.throws(() => session.saveResult(tid, match.id, match.target, match.target));
      const before = session.matches(tid);
      // A failure creating the next draw must also roll back the last result.
      if (count === 5 && index === pending.length - 1 && active.length > 2) {
        const originalRun = adapter.runSync;
        adapter.runSync = (query, ...params) => {
          if (query.startsWith('INSERT INTO matches')) throw Error('Injected next-round failure');
          return originalRun(query, ...params);
        };
        assert.throws(() => session.saveResult(tid, match.id, match.target, 0), /Injected/);
        adapter.runSync = originalRun;
        assert.deepEqual(session.matches(tid), before);
      }
      session.saveResult(tid, match.id, index % 2 ? 0 : match.target, index % 2 ? match.target : 0);
      played++;
      assert.throws(() => session.saveResult(tid, match.id, match.target, 0));
      const saved = session.matches(tid);
      session = reopenStore();
      assert.deepEqual(session.matches(tid), saved);
      if (index < pending.length - 1)
        assert.equal(
          saved.some((m) => m.round > round),
          false,
        );
    }
    current = session.matches(tid).filter((m) => m.round === round);
    active = current.map((m) => m.winner);
    assert.equal(active.length, Math.ceil(ids.length / 2));
    assert.ok(active.every((id) => ids.includes(id)));
    round++;
  }
  assert.equal(played, count - 1);
  assert.equal(session.tournament(tid).status, 'complete');
  const final = session.matches(tid).filter((m) => m.round === round - 1);
  assert.equal(final.length, 1);
  assert.equal(final[0].target, 5);
  assert.equal(final[0].winner, active[0]);
  assert.ok(registered.includes(active[0]));
  session.deleteTournament(tid);
}
console.log(
  'Passed complete Dynamic Knockout simulations for every count 2-128, limits, per-round membership/BYEs, manual opening assignments, score validation, restart reloads, transaction rollback, duplicate-result protection, and champions.',
);
sql.close();
// Close and reopen a real file-backed connection, including a partially scored round.
const diskPath = require('node:path').join(
  require('node:os').tmpdir(),
  `cuebracket-dynamic-${require('node:crypto').randomUUID()}.db`,
);
try {
  sql = new DatabaseSync(diskPath);
  let disk = reopenStore();
  const id = disk.createTournament('Disk restart', '8ball', 'dynamic_knockout', 3);
  for (let index = 0; index < 5; index++) disk.addPlayer(id, `Disk ${index}`);
  disk.startTournament(id, engine.shuffle(disk.participants(id).map((p) => p.id)));
  while (disk.tournament(id).status === 'active') {
    const match = disk.matches(id).find((m) => m.status === 'pending');
    assert.ok(match);
    disk.saveResult(id, match.id, match.target, 0);
    const snapshot = disk.matches(id);
    sql.close();
    sql = new DatabaseSync(diskPath);
    disk = reopenStore();
    assert.deepEqual(disk.matches(id), snapshot);
  }
  assert.equal(disk.matches(id).filter((m) => m.status === 'done').length, 4);
  assert.equal(disk.tournament(id).status, 'complete');
} finally {
  sql.close();
  fs.unlinkSync(diskPath);
}
console.log('Passed real file-backed SQLite close/reopen after each Dynamic Knockout result.');
console.log(
  'Passed scoring migration rollback/retry, legacy preservation, 127 round-specific knockout simulations (2–128 players), First-to round robin, 186 existing tournament simulations, configuration locks, manual assignments, and score validation.',
);

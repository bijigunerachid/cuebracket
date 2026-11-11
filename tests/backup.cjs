const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const modules = new Map();
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
const backup = load('src/backup.ts');
function reset(filename = ':memory:') {
  sql?.close();
  sql = new DatabaseSync(filename);
  store.init();
}
function create(format, count) {
  const id = store.createTournament('Café بطولة', 'snooker', format, 5, {
    mode: 'first_to',
    label: 'A',
    rounds: { final: { mode: 'best_of', value: 7 } },
  });
  for (let i = 0; i < count; i++) store.addPlayer(id, `Joueur ${i}`);
  return id;
}
function start(id) {
  store.startTournament(
    id,
    store.participants(id).map((p) => p.id),
  );
}
function finish(id) {
  while (store.tournament(id).status === 'active') {
    const m = store
      .matches(id)
      .find((m) => m.status === 'pending' && m.p1 !== null && m.p2 !== null);
    assert.ok(m);
    store.saveResult(id, m.id, m.target, 0);
  }
}
function snapshot(id) {
  const names = new Map(store.participants(id).map((p) => [p.id, p.name]));
  return store.matches(id).map(({ id, tournament_id, p1, p2, winner, ...m }) => ({
    ...m,
    p1: names.get(p1) ?? null,
    p2: names.get(p2) ?? null,
    winner: names.get(winner) ?? null,
  }));
}
for (const format of ['knockout', 'dynamic_knockout', 'round_robin']) {
  for (let n = 2; n <= (format === 'round_robin' ? 12 : 128); n++) {
    reset();
    const id = create(format, n);
    start(id);
    const first = store.matches(id).find((m) => m.status === 'pending' && m.p1 && m.p2);
    if (n > 2) store.saveResult(id, first.id, first.target, 0);
    const before = snapshot(id);
    const local = store.tournaments();
    const file = JSON.stringify(store.exportBackup());
    store.importBackup(backup.parseBackup(file));
    const restored = store.tournaments()[0].id;
    assert.notEqual(restored, id);
    assert.deepEqual(snapshot(restored), before);
    assert.deepEqual(store.tournament(id), local[0]);
    assert.deepEqual(
      store.participants(restored).map((p) => p.name),
      store.participants(id).map((p) => p.name),
    );
    assert.ok(
      store
        .participants(restored)
        .every((p) => !store.participants(id).some((old) => old.id === p.id)),
    );
    finish(restored);
    backup.validateBackup(store.exportBackup());
    assert.equal(store.tournament(restored).status, 'complete');
    assert.deepEqual(snapshot(id), before);
  }
}
console.log(
  'Passed backup/restore and continued play for knockout and Dynamic Knockout 2–128, round robin 2–12, BYEs, scoring rules, Unicode, and ID collision protection.',
);
reset();
const setup = create('dynamic_knockout', 5);
const setupBackup = store.exportBackup();
store.importBackup(setupBackup);
const restoredSetup = store.tournaments()[0].id;
start(restoredSetup);
finish(restoredSetup);
// Legacy Best-of rows may have no scoring snapshot fields. Normalize without losing results.
const legacy = {
  app: 'CueBracket',
  version: 1,
  createdAt: new Date().toISOString(),
  tournaments: [
    {
      id: 1,
      name: 'Legacy',
      game: '8ball',
      format: 'knockout',
      best_of: 5,
      status: 'complete',
      created_at: '2024-01-01 12:00:00',
    },
  ],
  players: [
    { id: 1, name: 'Legacy A' },
    { id: 2, name: 'Legacy B' },
  ],
  registrations: [
    { tournament_id: 1, player_id: 1, position: 0 },
    { tournament_id: 1, player_id: 2, position: 1 },
  ],
  matches: [
    {
      id: 1,
      tournament_id: 1,
      round: 1,
      slot: 0,
      p1: 1,
      p2: 2,
      s1: 3,
      s2: 1,
      winner: 1,
      status: 'done',
    },
  ],
};
store.importBackup(legacy);
const legacyMatch = store.matches(store.tournaments()[0].id)[0];
assert.equal(legacyMatch.target, 3);
assert.equal(legacyMatch.s1, 3);
assert.equal(legacyMatch.s2, 1);
const active = create('dynamic_knockout', 5);
start(active);
const valid = store.exportBackup();
const original = JSON.stringify(valid);
for (const mutate of [
  (b) => (b.version = 2),
  (b) => b.players.push(b.players[0]),
  (b) => (b.registrations[0].player_id = 999999),
  (b) => (b.registrations[1].position = b.registrations[0].position),
  (b) => (b.matches[0].tournament_id = 999999),
  (b) => (b.matches[0].p1 = 999999),
  (b) => (b.matches[0].s1 = 1),
  (b) => (b.matches[0].target = 99),
  (b) => (b.matches[0].round = 5),
  (b) => b.matches.push({ ...b.matches[0], id: 999999 }),
  (b) => b.matches.pop(),
  (b) => (b.tournaments.find((t) => t.id === active).status = 'complete'),
]) {
  const bad = JSON.parse(original);
  mutate(bad);
  assert.throws(() => store.importBackup(bad));
  const after = store.exportBackup();
  after.createdAt = valid.createdAt;
  assert.deepEqual(after, valid);
}
assert.throws(() => backup.parseBackup('{broken'), /valid JSON/);
assert.throws(() => backup.parseBackup(' '.repeat(backup.MAX_BACKUP_BYTES + 1)), /10 MB/);
assert.throws(() => backup.parseBackup('null'));
// A failure after players/tournaments/registrations and the first match rolls everything back.
const run = adapter.runSync;
let inserted = 0;
adapter.runSync = (query, ...params) => {
  const result = run(query, ...params);
  if (query.startsWith('INSERT INTO matches') && ++inserted === 2)
    throw Error('Injected disk failure');
  return result;
};
assert.throws(() => store.importBackup(valid), /Injected/);
adapter.runSync = run;
const after = store.exportBackup();
after.createdAt = valid.createdAt;
assert.deepEqual(after, valid);
store.importBackup(valid);
store.importBackup(valid);
assert.equal(store.tournaments().length, valid.tournaments.length * 3);
console.log(
  'Passed setup/complete imports, repeat imports, malformed/version/oversized rejection, invalid references/schedules/scores, and atomic rollback.',
);
const filename = path.join(os.tmpdir(), `cuebracket-backup-${randomUUID()}.db`);
try {
  reset(filename);
  store.importBackup(valid);
  const before = store.exportBackup();
  reset(filename);
  const reopened = store.exportBackup();
  reopened.createdAt = before.createdAt;
  assert.deepEqual(reopened, before);
  for (const t of store.tournaments().filter((t) => t.status === 'active')) finish(t.id);
} finally {
  sql.close();
  sql = null;
  fs.unlinkSync(filename);
}
console.log(
  'Passed file-backed SQLite close/reopen after import and completion of restored active tournaments.',
);

async function testFiles() {
  const files = new Map();
  let picked = { canceled: true };
  let available = true;
  let failShare = false;
  let sharedUri;
  class File {
    constructor(...parts) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return files.has(this.uri);
    }
    get size() {
      return files.get(this.uri)?.size ?? Buffer.byteLength(files.get(this.uri)?.text ?? '');
    }
    create() {
      files.set(this.uri, { text: '' });
    }
    write(text) {
      files.set(this.uri, { text });
    }
    text() {
      return Promise.resolve(files.get(this.uri).text);
    }
    delete() {
      files.delete(this.uri);
    }
  }
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('src/backupFiles.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('exports', 'require', 'module', code)(
    module.exports,
    (name) => {
      if (name === 'expo-document-picker')
        return {
          getDocumentAsync: async (options) => {
            assert.equal(options.copyToCacheDirectory, true);
            return picked;
          },
        };
      if (name === 'expo-file-system') return { File, Paths: { cache: { uri: 'file:///cache' } } };
      if (name === 'expo-sharing')
        return {
          isAvailableAsync: async () => available,
          shareAsync: async (uri) => {
            sharedUri = uri;
            if (failShare) throw Error('Share failure');
          },
        };
      if (name === './db') return { exportBackup: () => valid };
      if (name === './backup') return backup;
      return require(name);
    },
    module,
  );
  const io = module.exports;
  assert.equal(await io.pickBackup(), null);
  const choose = (uri, text, size) => {
    files.set(uri, { text, size });
    picked = { canceled: false, assets: [{ uri, name: 'backup.json', size }] };
  };
  choose('file:///cache/import.json', original);
  assert.deepEqual((await io.pickBackup()).backup, valid);
  assert.equal(files.has('file:///cache/import.json'), false);
  choose('file:///cache/broken.json', '{broken');
  await assert.rejects(io.pickBackup(), /valid JSON/);
  assert.equal(files.has('file:///cache/broken.json'), false);
  choose('file:///cache/huge.json', '{}', backup.MAX_BACKUP_BYTES + 1);
  await assert.rejects(io.pickBackup(), /10 MB/);
  choose('file:///documents/original.json', original);
  await io.pickBackup();
  assert.equal(files.has('file:///documents/original.json'), true);
  await io.shareBackup();
  assert.deepEqual(JSON.parse(files.get(sharedUri).text), valid);
  assert.equal(files.has(sharedUri), true); // Recipient can still read after dialog completion.
  failShare = true;
  await assert.rejects(io.shareBackup(), /Share failure/);
  available = false;
  await assert.rejects(io.shareBackup(), /unavailable/);
  console.log(
    'Passed mocked picker cancellation, cache cleanup, original-file preservation, oversized files, sharing availability/failure, and exported JSON. Native Android picker/share behavior remains a device check.',
  );
}
testFiles().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

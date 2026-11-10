import type { SQLiteDatabase } from 'expo-sqlite';

// Version 2 is additive: legacy settings, IDs, players, scores and draws are retained.
export function migrateScoring(db: SQLiteDatabase) {
  db.withTransactionSync(() => {
    db.execSync(`
      ALTER TABLE tournaments ADD COLUMN scoring_mode TEXT NOT NULL DEFAULT 'best_of';
      ALTER TABLE tournaments ADD COLUMN first_to_label TEXT NOT NULL DEFAULT 'First to';
      ALTER TABLE tournaments ADD COLUMN round_rules TEXT NOT NULL DEFAULT '{}';
      ALTER TABLE matches ADD COLUMN target INTEGER;
      ALTER TABLE matches ADD COLUMN scoring_mode TEXT NOT NULL DEFAULT 'best_of';
      ALTER TABLE matches ADD COLUMN scoring_value INTEGER;
      UPDATE matches SET target=(SELECT best_of/2+1 FROM tournaments WHERE id=matches.tournament_id),
        scoring_value=(SELECT best_of FROM tournaments WHERE id=matches.tournament_id);
    `);
    // Preserve all existing integrity checks while replacing the old universal score target.
    for (const table of ['tournaments', 'matches']) {
      for (const operation of ['insert', 'update']) {
        const name = `validate_${table}_${operation}`;
        const existing = db.getFirstSync<{ sql: string }>(
          "SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?",
          name,
        );
        if (!existing) throw Error('Missing database validation trigger');
        const oldTarget =
          'max(NEW.s1,NEW.s2)!=(SELECT best_of/2+1 FROM tournaments WHERE id=NEW.tournament_id)';
        if (table === 'matches' && !existing.sql.includes(oldTarget))
          throw Error('Unrecognized legacy match validation trigger');
        const extra =
          table === 'tournaments'
            ? " OR NEW.scoring_mode NOT IN ('best_of','first_to') OR length(trim(NEW.first_to_label))=0 OR length(NEW.first_to_label)>24 OR NOT json_valid(NEW.round_rules) OR json_type(NEW.round_rules)!='object'"
            : ` OR NEW.scoring_mode NOT IN ('best_of','first_to')
              OR (NEW.target IS NOT NULL AND (typeof(NEW.target)!='integer' OR NEW.target<1))
              OR (NEW.scoring_value IS NOT NULL AND (typeof(NEW.scoring_value)!='integer' OR NEW.scoring_value<1 OR (NEW.scoring_mode='best_of' AND NEW.scoring_value%2=0)))
              OR (NEW.target IS NOT NULL AND NEW.scoring_value IS NOT NULL AND NEW.target!=CASE WHEN NEW.scoring_mode='first_to' THEN NEW.scoring_value ELSE NEW.scoring_value/2+1 END)`;
        const sql = existing.sql
          .replace(
            oldTarget,
            'max(NEW.s1,NEW.s2)!=COALESCE(NEW.target,(SELECT best_of/2+1 FROM tournaments WHERE id=NEW.tournament_id))',
          )
          .replace(' BEGIN SELECT RAISE', `${extra} BEGIN SELECT RAISE`);
        if (sql === existing.sql) throw Error('Cannot migrate database validation trigger');
        db.execSync(`DROP TRIGGER ${name}`);
        db.execSync(sql);
      }
    }
    db.execSync('PRAGMA user_version=2');
  });
}

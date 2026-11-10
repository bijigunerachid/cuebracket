import * as SQLite from 'expo-sqlite';
import {Format,Game,Match,Player,Tournament,knockoutPairs,roundRobinPairs,shuffle,validateScore,validateSettings} from './engine';
let db:SQLite.SQLiteDatabase;
export function init(){db??=SQLite.openDatabaseSync('cuebracket.db');db.execSync(`PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS tournaments(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,game TEXT NOT NULL,format TEXT NOT NULL,best_of INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'setup',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS players(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS tournament_players(tournament_id INTEGER NOT NULL,player_id INTEGER NOT NULL,position INTEGER NOT NULL,PRIMARY KEY(tournament_id,player_id),FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,FOREIGN KEY(player_id) REFERENCES players(id));
 CREATE TABLE IF NOT EXISTS matches(id INTEGER PRIMARY KEY AUTOINCREMENT,tournament_id INTEGER NOT NULL,round INTEGER NOT NULL,slot INTEGER NOT NULL,p1 INTEGER,p2 INTEGER,s1 INTEGER,s2 INTEGER,winner INTEGER,status TEXT NOT NULL DEFAULT 'pending',UNIQUE(tournament_id,round,slot),FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE);
 `);migrate();}
export const tournaments=()=>db.getAllSync<Tournament>('SELECT * FROM tournaments ORDER BY id DESC');
export const tournament=(id:number)=>db.getFirstSync<Tournament>('SELECT * FROM tournaments WHERE id=?',id);
export const allPlayers=()=>db.getAllSync<Player>('SELECT * FROM players ORDER BY name COLLATE NOCASE');
export const participants=(id:number)=>db.getAllSync<Player>('SELECT p.* FROM players p JOIN tournament_players tp ON tp.player_id=p.id WHERE tp.tournament_id=? ORDER BY tp.position,tp.player_id',id);
export const matches=(id:number)=>db.getAllSync<Match>('SELECT * FROM matches WHERE tournament_id=? ORDER BY round,slot',id);
export function createTournament(name:string,game:Game,format:Format,bestOf:number){if(!name.trim())throw Error('Tournament name is required');validateSettings(game,format,bestOf);return Number(db.runSync('INSERT INTO tournaments(name,game,format,best_of) VALUES(?,?,?,?)',name.trim(),game,format,bestOf).lastInsertRowId)}
export function addPlayer(id:number,name:string){const trimmed=name.trim();if(!trimmed)throw Error('Enter a player name');const t=tournament(id);if(!t||t.status!=='setup')throw Error('Tournament already started');const existing=participants(id);if(existing.some(p=>p.name.toLowerCase()===trimmed.toLowerCase()))throw Error('Player already registered');db.withTransactionSync(()=>{const pid=Number(db.runSync('INSERT INTO players(name) VALUES(?)',trimmed).lastInsertRowId);const position=db.getFirstSync<{next:number}>('SELECT COALESCE(MAX(position),-1)+1 next FROM tournament_players WHERE tournament_id=?',id)!.next;db.runSync('INSERT INTO tournament_players VALUES(?,?,?)',id,pid,position)});}
export function removePlayer(id:number,pid:number){if(tournament(id)?.status!=='setup')throw Error('Tournament already started');db.withTransactionSync(()=>{db.runSync('DELETE FROM tournament_players WHERE tournament_id=? AND player_id=?',id,pid);cleanupPlayers();})}
export function deleteTournament(id:number){db.withTransactionSync(()=>{db.runSync('DELETE FROM tournaments WHERE id=?',id);cleanupPlayers();})}
export function startTournament(id:number,orderedIds:number[]){const t=tournament(id);if(!t||t.status!=='setup')throw Error('Tournament cannot be started');validateSettings(t.game,t.format,t.best_of);const registered=participants(id).map(p=>p.id);if(registered.length<2)throw Error('Add at least 2 players');if(orderedIds.length!==registered.length||new Set(orderedIds).size!==registered.length||orderedIds.some(p=>!registered.includes(p)))throw Error('Draw must contain each player exactly once');const pairs=t.format==='knockout'?knockoutPairs(orderedIds):roundRobinPairs(orderedIds);db.withTransactionSync(()=>{
 for(const m of pairs)db.runSync('INSERT INTO matches(tournament_id,round,slot,p1,p2,status) VALUES(?,?,?,?,?,?)',id,m.round,m.slot,m.p1,m.p2,'pending');
 if(t.format==='knockout'){
  const size=2**Math.ceil(Math.log2(registered.length));let count=size/2,round=2;
  while(count>1){count/=2;for(let slot=0;slot<count;slot++)db.runSync('INSERT INTO matches(tournament_id,round,slot,status) VALUES(?,?,?,?)',id,round,slot,'pending');round++}
  // Auto-advance initial BYEs.
  for(const m of matches(id).filter(x=>x.round===1&&((x.p1===null)!==(x.p2===null))))advance(id,m.id,m.p1??m.p2!,true);
 }
 db.runSync("UPDATE tournaments SET status='active' WHERE id=?",id);
 });}
function advance(tid:number,matchId:number,winner:number,bye=false){const m=db.getFirstSync<Match>('SELECT * FROM matches WHERE id=? AND tournament_id=?',matchId,tid);if(!m)throw Error('Match not found');db.runSync('UPDATE matches SET winner=?,status=? WHERE id=?',winner,bye?'bye':'done',matchId);const t=tournament(tid)!;if(t.format!=='knockout')return;
 const next=db.getFirstSync<Match>('SELECT * FROM matches WHERE tournament_id=? AND round=? AND slot=?',tid,m.round+1,Math.floor(m.slot/2));
 if(!next){db.runSync("UPDATE tournaments SET status='complete' WHERE id=?",tid);return}
 const column=m.slot%2===0?'p1':'p2';db.runSync(`UPDATE matches SET ${column}=? WHERE id=?`,winner,next.id);
}
export function saveResult(tid:number,mid:number,s1:number,s2:number){const t=tournament(tid);const m=db.getFirstSync<Match>('SELECT * FROM matches WHERE id=? AND tournament_id=?',mid,tid);if(!t||!m||t.status!=='active'||m.status!=='pending'||m.p1===null||m.p2===null)throw Error('This match is not ready');if(!validateScore(s1,s2,t.best_of))throw Error(`Winner must reach ${Math.floor(t.best_of/2)+1}; loser must have fewer`);const winner=s1>s2?m.p1:m.p2;
 db.withTransactionSync(()=>{db.runSync('UPDATE matches SET s1=?,s2=? WHERE id=?',s1,s2,mid);advance(tid,mid,winner);if(t.format==='round_robin'){const pending=db.getFirstSync<{n:number}>("SELECT COUNT(*) n FROM matches WHERE tournament_id=? AND status='pending'",tid);if(pending?.n===0)db.runSync("UPDATE tournaments SET status='complete' WHERE id=?",tid)}})}
export function standings(tid:number){const p=participants(tid);const ms=matches(tid).filter(m=>m.status==='done');return p.map(player=>{const played=ms.filter(m=>m.p1===player.id||m.p2===player.id);return {player,wins:played.filter(m=>m.winner===player.id).length,played:played.length,diff:played.reduce((a,m)=>a+(m.p1===player.id?(m.s1!-m.s2!):(m.s2!-m.s1!)),0)}}).sort((a,b)=>b.wins-a.wins||b.diff-a.diff||a.player.name.localeCompare(b.player.name))}
export {shuffle};

function cleanupPlayers(){db.runSync(`DELETE FROM players WHERE NOT EXISTS (SELECT 1 FROM tournament_players tp WHERE tp.player_id=players.id) AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.p1=players.id OR m.p2=players.id OR m.winner=players.id)`)}

// Triggers add write constraints without rebuilding tables or discarding legacy results.
function migrate(){
 const version=db.getFirstSync<{user_version:number}>('PRAGMA user_version')!.user_version;
 if(version>1)throw Error('This database was created by a newer version of CueBracket');
 if(version===1)return;
 db.withTransactionSync(()=>{
  for(const t of tournaments()){
   const ids=participants(t.id).map(p=>p.id);
   ids.forEach((pid,position)=>db.runSync('UPDATE tournament_players SET position=? WHERE tournament_id=? AND player_id=?',position,t.id,pid));
  }
  db.execSync('CREATE UNIQUE INDEX IF NOT EXISTS participant_position ON tournament_players(tournament_id,position)');
  const rules:{table:string,condition:string,message:string}[]=[
   {table:'tournaments',condition:"length(trim(NEW.name))=0 OR NEW.game NOT IN ('8ball','snooker') OR NEW.format NOT IN ('knockout','round_robin') OR typeof(NEW.best_of)!='integer' OR NEW.best_of<1 OR NEW.best_of%2=0 OR NEW.status NOT IN ('setup','active','complete')",message:'Invalid tournament settings'},
   {table:'players',condition:'length(trim(NEW.name))=0',message:'Player name is required'},
   {table:'tournament_players',condition:"typeof(NEW.position)!='integer' OR NEW.position<0",message:'Invalid participant position'},
   {table:'matches',condition:`typeof(NEW.round)!='integer' OR NEW.round<1 OR typeof(NEW.slot)!='integer' OR NEW.slot<0
    OR NEW.status NOT IN ('pending','done','bye')
    OR (NEW.p1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tournament_players WHERE tournament_id=NEW.tournament_id AND player_id=NEW.p1))
    OR (NEW.p2 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tournament_players WHERE tournament_id=NEW.tournament_id AND player_id=NEW.p2))
    OR (NEW.p1 IS NOT NULL AND NEW.p1=NEW.p2)
    OR (NEW.winner IS NOT NULL AND NEW.winner IS NOT NEW.p1 AND NEW.winner IS NOT NEW.p2)
    OR (NEW.status='pending' AND NEW.winner IS NOT NULL)
    OR (NEW.status='bye' AND (NEW.winner IS NULL OR ((NEW.p1 IS NULL)=(NEW.p2 IS NULL))))
    OR (NEW.status='done' AND (NEW.p1 IS NULL OR NEW.p2 IS NULL OR NEW.winner IS NULL OR NEW.s1 IS NULL OR NEW.s2 IS NULL
      OR typeof(NEW.s1)!='integer' OR typeof(NEW.s2)!='integer' OR NEW.s1<0 OR NEW.s2<0
      OR max(NEW.s1,NEW.s2)!=(SELECT best_of/2+1 FROM tournaments WHERE id=NEW.tournament_id)
      OR NEW.s1=NEW.s2 OR NEW.winner IS NOT CASE WHEN NEW.s1>NEW.s2 THEN NEW.p1 ELSE NEW.p2 END))`,message:'Invalid match data'},
  ];
  for(const rule of rules)for(const operation of ['INSERT','UPDATE'])db.execSync(`CREATE TRIGGER IF NOT EXISTS validate_${rule.table}_${operation.toLowerCase()} BEFORE ${operation} ON ${rule.table} WHEN ${rule.condition} BEGIN SELECT RAISE(ABORT,'${rule.message}'); END;`);
  db.execSync('PRAGMA user_version=1');
 });
}

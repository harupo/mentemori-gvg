import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';

const API = 'https://api.mentemori.icu';
const SERVER = '1'; // JP
const CONCURRENCY = 3;
const DELAY_MS = 100;

const SN = { 1: 'JP', 2: 'KR', 3: 'Asia', 4: 'NA', 5: 'EU', 6: 'Global' };
const CN = { 1: 'Elite', 2: 'Expert', 3: 'Grand Master' };
const CNA = { 1: 'EL', 2: 'EX', 3: 'GM' };
const BN = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

const CHAR_MAP = {
  1:'藍',2:'藍',3:'藍',4:'藍',5:'藍',6:'藍',7:'藍',8:'藍',9:'藍',10:'藍',
  11:'紅',12:'紅',13:'紅',14:'紅',15:'紅',16:'紅',17:'紅',18:'紅',19:'紅',20:'紅',
  21:'翠',22:'翠',23:'翠',24:'翠',25:'翠',26:'翠',27:'翠',28:'翠',29:'翠',30:'翠',
  31:'黄',32:'黄',33:'黄',34:'黄',35:'黄',36:'黄',37:'黄',38:'黄',39:'黄',40:'黄',
  41:'天',42:'天',43:'天',44:'天',45:'天',
  46:'冥',47:'冥',48:'冥',49:'冥',50:'冥',
  51:'紅',52:'藍',53:'黄',54:'紅',55:'翠',56:'翠',57:'藍',58:'紅',59:'藍',60:'翠',
  61:'冥',62:'紅',63:'冥',64:'藍',65:'天',66:'黄',67:'黄',68:'藍',69:'冥',70:'翠',
  71:'黄',72:'紅',73:'黄',74:'藍',75:'紅',76:'翠',77:'藍',78:'黄',79:'藍',80:'翠',
  81:'黄',82:'翠',83:'黄',84:'藍',85:'紅',86:'天',87:'冥',88:'天',89:'紅',
  93:'紅',95:'藍',96:'黄',99:'紅',100:'黄',101:'藍',102:'紅',103:'翠',
  105:'冥',106:'藍',107:'紅',108:'翠',109:'天',111:'翠',112:'紅',113:'黄',114:'翠',115:'黄',
  116:'翠',117:'天',121:'天',122:'紅',123:'藍',124:'翠',125:'冥',126:'黄',128:'天',129:'冥',
  130:'紅',131:'藍',132:'翠',135:'黄',137:'冥',139:'黄'
};
const ATTRS = ['藍','紅','翠','黄','天','冥'];

function fmtW(wid) { return String(parseInt(String(wid).slice(1))); }
function gW(gid) { return String(parseInt(String(gid).slice(-3))); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 503) throw new Error('503');
      const j = await res.json();
      if (j.status === 200) return j;
    } catch (e) {
      console.warn(`  retry ${i + 1}/${retries}: ${url} (${e.message})`);
    }
    await sleep(1000 * (i + 1));
  }
  return null;
}

async function runQueue(tasks, concurrency, fn) {
  const q = [...tasks];
  const results = [];
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (q.length) {
      const task = q.shift();
      if (task === undefined) break;
      const r = await fn(task);
      if (r) results.push(r);
      done++;
      if (done % 20 === 0) console.log(`  ${done}/${tasks.length}`);
      await sleep(DELAY_MS);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchLocal() {
  console.log('=== ギルドバトル (JP) ===');
  const wr = await fetchJSON(`${API}/worlds`);
  if (!wr) throw new Error('worlds取得失敗');

  const targets = wr.data
    .filter(w => w.localgvg && String(w.world_id).startsWith(SERVER))
    .map(w => w.world_id);
  console.log(`  ${targets.length} ワールド`);

  const items = await runQueue(targets, CONCURRENCY, async (wid) => {
    const j = await fetchJSON(`${API}/${wid}/localgvg/latest`);
    if (!j?.data?.castles) return null;
    const guilds = j.data.guilds || {};
    const castles = {};
    for (const c of j.data.castles) {
      const gid = c.GuildId;
      castles[c.CastleId] = {
        guildId: gid,
        guildName: gid ? (guilds[String(gid)] || `ID:${gid}`) : 'NPC'
      };
    }
    return { wid, label: fmtW(wid), castles, timestamp: j.timestamp };
  });

  items.sort((a, b) => a.wid - b.wid);
  const ts = Math.max(0, ...items.map(i => i.timestamp || 0));
  console.log(`  ${items.length} ワールド取得完了`);
  return { items, timestamp: ts };
}

async function fetchGlobal() {
  console.log('=== グランドバトル (JP) ===');
  const wg = await fetchJSON(`${API}/wgroups`);
  if (!wg) throw new Error('wgroups取得失敗');

  const grps = wg.data.filter(g => g.globalgvg && String(g.worlds[0]).charAt(0) === SERVER);
  if (!grps.length) {
    console.log(`  デバッグ: wgroups total=${wg.data.length}`);
    if (wg.data.length > 0) {
      const sample = wg.data[0];
      console.log(`  デバッグ: サンプル keys=${Object.keys(sample).join(', ')}`);
      console.log(`  デバッグ: globalgvg=${sample.globalgvg}, worlds=${JSON.stringify(sample.worlds)}`);
      const withGvg = wg.data.filter(g => g.globalgvg);
      console.log(`  デバッグ: globalgvg=true は ${withGvg.length}件`);
      const jpOnly = wg.data.filter(g => String(g.worlds?.[0]).charAt(0) === SERVER);
      console.log(`  デバッグ: JP(worlds[0]先頭='1') は ${jpOnly.length}件`);
    }
  }
  const classes = [1, 2, 3];
  const blocks = [0, 1, 2, 3];
  const tasks = [];
  for (const grp of grps)
    for (const c of classes)
      for (const b of blocks)
        tasks.push({ grp, c, b });
  console.log(`  ${tasks.length} ブロック`);

  const items = await runQueue(tasks, CONCURRENCY, async (t) => {
    const j = await fetchJSON(`${API}/wg/${t.grp.group_id}/globalgvg/${t.c}/${t.b}/latest`);
    if (!j?.data?.castles) return null;
    const guilds = j.data.guilds || {};
    const castles = {};
    for (const c of j.data.castles) {
      const gid = c.GuildId;
      const gn = gid ? (guilds[String(gid)] || `ID:${gid}`) : 'NPC';
      castles[c.CastleId] = {
        guildId: gid,
        guildName: gid ? `${gn} (${gW(gid)})` : 'NPC'
      };
    }
    const sn = SN[String(t.grp.worlds[0]).charAt(0)] || '?';
    return {
      label: `${sn} G${t.grp.group_id} ${CN[t.c]} ${BN[t.b]}`,
      gid: t.grp.group_id,
      cls: t.c,
      blk: t.b,
      sn: sn,
      wds: t.grp.worlds.map(fmtW).join(', '),
      castles,
      timestamp: j.timestamp
    };
  });

  items.sort((a, b) => {
    if (a.sn !== b.sn) return a.sn.localeCompare(b.sn);
    if (a.gid !== b.gid) return a.gid - b.gid;
    if (a.cls !== b.cls) return a.cls - b.cls;
    return a.blk - b.blk;
  });
  const ts = Math.max(0, ...items.map(i => i.timestamp || 0));
  console.log(`  ${items.length} ブロック取得完了`);
  return { items, timestamp: ts };
}

async function fetchArena() {
  console.log('=== バトルリーグ採用属性 (JP) ===');
  const wr = await fetchJSON(`${API}/worlds`);
  if (!wr) throw new Error('worlds取得失敗');

  const targets = wr.data
    .filter(w => w.ranking && String(w.world_id).startsWith(SERVER))
    .map(w => w.world_id);
  console.log(`  ${targets.length} ワールド`);

  const items = await runQueue(targets, CONCURRENCY, async (wid) => {
    const j = await fetchJSON(`${API}/${wid}/arena/latest`);
    if (!j?.data || !Array.isArray(j.data) || j.data.length === 0) return null;

    const players = j.data;
    const raw = Object.fromEntries(ATTRS.map(a => [a, 0]));
    let total = 0;
    const unmappedIds = {};

    for (const player of players) {
      for (const char of (player.UserCharacterInfoList || [])) {
        const attr = CHAR_MAP[char.CharacterId];
        if (attr) {
          raw[attr]++;
          total++;
        } else {
          unmappedIds[char.CharacterId] = (unmappedIds[char.CharacterId] || 0) + 1;
        }
      }
    }

    if (total === 0) return null;

    const pct = Object.fromEntries(ATTRS.map(a => [a, raw[a] / total * 100]));
    const dominant = ATTRS.reduce((a, b) => pct[a] >= pct[b] ? a : b);

    const unknownList = Object.entries(unmappedIds).sort((a, b) => b[1] - a[1]);
    if (unknownList.length > 0) {
      console.warn(`  WARN World ${wid}: 未登録ID ${unknownList.map(([id,n])=>`${id}(${n})`).join(', ')}`);
    }

    return {
      wid,
      label: fmtW(wid),
      timestamp: j.timestamp,
      player_count: players.length,
      char_count: total,
      unmapped_count: Object.values(unmappedIds).reduce((s,v)=>s+v,0),
      pct,
      dominant,
    };
  });

  items.sort((a, b) => a.wid - b.wid);
  const ts = Math.max(0, ...items.map(i => i.timestamp || 0));
  console.log(`  ${items.length} ワールド取得完了`);
  console.log(`  合計プレイヤー: ${items.reduce((s,i)=>s+i.player_count,0)}`);
  console.log(`  合計キャラスロット: ${items.reduce((s,i)=>s+i.char_count,0)}`);
  return { items, timestamp: ts };
}

async function main() {
  mkdirSync('data', { recursive: true });

  const isManual = process.env.GITHUB_EVENT_NAME === 'workflow_dispatch';
  if (isManual) {
    console.log('=== 手動実行: スキップチェックをバイパス ===');
  } else {
    try {
      const existingL = JSON.parse(readFileSync('data/local.json', 'utf-8'));
      const existingG = JSON.parse(readFileSync('data/global.json', 'utf-8'));
      const arenaExists = existsSync('data/arena.json');
      if (existingL.fetchedAt && existingG.items?.length > 0 && arenaExists) {
        const prev = new Date(existingL.fetchedAt);
        const now = new Date();
        const toJSTDate = d => new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);
        if (toJSTDate(prev) === toJSTDate(now)) {
          console.log(`=== スキップ: 同日(JST)のデータ取得済み (${toJSTDate(prev)}) ===`);
          return;
        }
      }
    } catch (_) { /* ファイルなし or パース失敗 → 通常実行 */ }
  }

  const local = await fetchLocal();
  local.fetchedAt = new Date().toISOString();
  writeFileSync('data/local.json', JSON.stringify(local));
  console.log(`  → data/local.json (${(JSON.stringify(local).length / 1024).toFixed(1)} KB)`);

  await sleep(2000);

  const global = await fetchGlobal();
  global.fetchedAt = new Date().toISOString();
  writeFileSync('data/global.json', JSON.stringify(global));
  console.log(`  → data/global.json (${(JSON.stringify(global).length / 1024).toFixed(1)} KB)`);

  await sleep(2000);

  const arena = await fetchArena();
  arena.fetchedAt = new Date().toISOString();
  writeFileSync('data/arena.json', JSON.stringify(arena));
  console.log(`  → data/arena.json (${(JSON.stringify(arena).length / 1024).toFixed(1)} KB)`);

  // 履歴保存（先にhistoryを保存してからストリーク計算する）
  saveHistory(local, global, arena);

  // 中央拠点ストリーク計算（historyを参照するため saveHistory の後に実行）
  saveCenterStreaks(local);

  console.log('=== 完了 ===');
}

function saveHistory(local, global, arena) {
  const toJSTDate = d => new Date(new Date(d).getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const today = toJSTDate(local.fetchedAt || new Date().toISOString());

  mkdirSync('data/history/local', { recursive: true });
  mkdirSync('data/history/global', { recursive: true });
  mkdirSync('data/history/arena', { recursive: true });

  const indexPath = 'data/history/index.json';
  let index = { local: [], global: [], arena: [] };
  if (existsSync(indexPath)) {
    try { index = JSON.parse(readFileSync(indexPath, 'utf-8')); } catch {}
  }
  if (!index.arena) index.arena = [];

  if (local.items?.length > 0) {
    const lPath = `data/history/local/${today}.json`;
    writeFileSync(lPath, JSON.stringify(local));
    if (!index.local.includes(today)) index.local.push(today);
    console.log(`  → ${lPath}`);
  }

  if (global.items?.length > 0) {
    const gPath = `data/history/global/${today}.json`;
    writeFileSync(gPath, JSON.stringify(global));
    if (!index.global.includes(today)) index.global.push(today);
    console.log(`  → ${gPath}`);
  }

  if (arena.items?.length > 0) {
    const aPath = `data/history/arena/${today}.json`;
    writeFileSync(aPath, JSON.stringify(arena));
    if (!index.arena.includes(today)) index.arena.push(today);
    console.log(`  → ${aPath}`);
  }

  index.local.sort();
  index.global.sort();
  index.arena.sort();
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`  → ${indexPath} (local:${index.local.length}件, global:${index.global.length}件, arena:${index.arena.length}件)`);
}

// ═══ 中央拠点 連続占拠ストリーク計算 ══════════════════════════════
function saveCenterStreaks(local) {
  console.log('=== 中央拠点ストリーク計算 ===');
  const CENTER_CASTLES = [1, 2, 3, 4, 5];

  function scoreFromItem(item) {
    const co = item.castles || {};
    const gc = {};
    for (const cid of CENTER_CASTLES) {
      const g = co[String(cid)] || co[cid];
      if (!g) continue;
      const k = String(g.guildId || g.guildName || '');
      if (k) gc[k] = (gc[k] || 0) + 1;
    }
    const vals = Object.values(gc);
    if (!vals.length) return { max: 0, gid: null };
    const max = Math.max(...vals);
    const gid = Object.keys(gc).find(k => gc[k] === max) || null;
    return { max, gid };
  }

  const toJSTDate = d => new Date(new Date(d).getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const today = toJSTDate(local.fetchedAt || new Date().toISOString());

  // 過去4日分のhistoryをreadFileSyncで読み込む
  const histories = [];
  for (let i = 1; i <= 4; i++) {
    const d = new Date(new Date(local.fetchedAt || new Date()).getTime() - i * 86400000);
    const date = toJSTDate(d.toISOString());
    const path = `data/history/local/${date}.json`;
    try {
      histories.push(JSON.parse(readFileSync(path, 'utf-8')));
      console.log(`  loaded: ${date}`);
    } catch {
      histories.push(null);
    }
  }

  // 各ワールドのストリーク計算
  const streaks = {};
  for (const item of (local.items || [])) {
    const label = String(item.label ?? '');
    if (!label) continue;

    const { max: s0, gid: g0 } = scoreFromItem(item);
    let streak = 1, prevMax = s0, prevGid = g0;

    for (const hist of histories) {
      if (!hist) break;
      const histItem = (hist.items || []).find(it => String(it.label) === label);
      if (!histItem) break;
      const { max: si, gid: gi } = scoreFromItem(histItem);
      if (gi === prevGid && prevMax >= si) {
        streak++; prevMax = si; prevGid = gi;
      } else {
        break;
      }
    }

    streaks[label] = Math.min(streak, 99);
  }

  const dist = Object.values(streaks).reduce((a, v) => { a[v] = (a[v]||0)+1; return a; }, {});
  console.log(`  dist: ${JSON.stringify(dist)}`);
  writeFileSync('data/center_streaks.json', JSON.stringify({ date: today, streaks }));
  console.log(`  → data/center_streaks.json (${Object.keys(streaks).length} worlds)`);
}

main().catch(e => { console.error(e); process.exit(1); });

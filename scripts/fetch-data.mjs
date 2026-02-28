import { writeFileSync, mkdirSync } from 'fs';

const API = 'https://api.mentemori.icu';
const SERVER = '1'; // JP
const CONCURRENCY = 3;
const DELAY_MS = 100;

const SN = { 1: 'JP', 2: 'KR', 3: 'Asia', 4: 'NA', 5: 'EU', 6: 'Global' };
const CN = { 1: 'Elite', 2: 'Expert', 3: 'Grand Master' };
const CNA = { 1: 'EL', 2: 'EX', 3: 'GM' };
const BN = { 0: 'A', 1: 'B', 2: 'C', 3: 'D' };

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

// ギルドバトル
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

// グランドバトル
async function fetchGlobal() {
  console.log('=== グランドバトル (JP) ===');
  const wg = await fetchJSON(`${API}/wgroups`);
  if (!wg) throw new Error('wgroups取得失敗');

  const grps = wg.data.filter(g => g.globalgvg && String(g.worlds[0]).charAt(0) === SERVER);
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

// メイン
async function main() {
  mkdirSync('data', { recursive: true });

  const local = await fetchLocal();
  writeFileSync('data/local.json', JSON.stringify(local));
  console.log(`  → data/local.json (${(JSON.stringify(local).length / 1024).toFixed(1)} KB)`);

  await sleep(2000); // API負荷軽減

  const global = await fetchGlobal();
  writeFileSync('data/global.json', JSON.stringify(global));
  console.log(`  → data/global.json (${(JSON.stringify(global).length / 1024).toFixed(1)} KB)`);

  console.log('=== 完了 ===');
}

main().catch(e => { console.error(e); process.exit(1); });

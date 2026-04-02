// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 【fetch-data.mjs への追加コード】
// 中央拠点 連続占拠ストリーク計算
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// ① この関数を fetch-data.mjs の saveHistory 関数の直後に追加
// ② main() 内の saveHistory() 呼び出しの直後に以下を追加:
//
//   saveHistory(local, global, arena);
//   saveCenterStreaks(local);   ← 追加
//
// ────────────────────────────────────────────────────────────────────────

function saveCenterStreaks(local) {
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

  // fetchedAt から JST 日付を求める（saveHistory と同じロジック）
  const toJSTDate = d => new Date(new Date(d).getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const today = toJSTDate(local.fetchedAt || new Date().toISOString());

  // 過去4日分の history を readFileSync で読み込む
  const histories = [];
  for (let i = 1; i <= 4; i++) {
    const d = new Date(new Date(local.fetchedAt || new Date()).getTime() - i * 86400000);
    const date = toJSTDate(d.toISOString());
    const path = `data/history/local/${date}.json`;
    try {
      histories.push(JSON.parse(readFileSync(path, 'utf-8')));
      console.log(`  [streak] loaded: ${date}`);
    } catch {
      histories.push(null);
    }
  }

  // ストリーク計算
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
      } else break;
    }

    streaks[label] = Math.min(streak, 99);
  }

  const dist = Object.values(streaks).reduce((a, v) => { a[v] = (a[v]||0)+1; return a; }, {});
  console.log(`  [streak] dist: ${JSON.stringify(dist)}`);
  writeFileSync('data/center_streaks.json', JSON.stringify({ date: today, streaks }));
  console.log(`  → data/center_streaks.json (${Object.keys(streaks).length} worlds)`);
}

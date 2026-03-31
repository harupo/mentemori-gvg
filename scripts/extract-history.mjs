/**
 * extract-history.mjs
 * Gitコミット履歴から data/local.json と data/global.json の過去分を抽出し、
 * data/history/ に日付別JSONとして保存する。
 *
 * 使い方: リポジトリルートで実行
 *   node scripts/extract-history.mjs
 *
 * 前提: gitコマンドが使える環境（Claude Code等）
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }).trim();
}

function toJSTDate(isoOrUnix) {
  const d = typeof isoOrUnix === 'number'
    ? new Date(isoOrUnix * 1000)
    : new Date(isoOrUnix);
  return new Date(d.getTime() + 9 * 3600000).toISOString().slice(0, 10);
}

function extractFile(commitHash, filePath) {
  try {
    return run(`git show ${commitHash}:${filePath}`);
  } catch {
    return null;
  }
}

// ディレクトリ作成
mkdirSync('data/history/local', { recursive: true });
mkdirSync('data/history/global', { recursive: true });

// 既存のindex.jsonがあれば読み込む
const indexPath = 'data/history/index.json';
let index = { local: [], global: [] };
if (existsSync(indexPath)) {
  try { index = JSON.parse(readFileSync(indexPath, 'utf-8')); } catch {}
}

// data/local.json を変更したコミット一覧を取得
const localCommits = run('git log --format="%H %aI" --diff-filter=AM -- data/local.json')
  .split('\n').filter(Boolean);
const globalCommits = run('git log --format="%H %aI" --diff-filter=AM -- data/global.json')
  .split('\n').filter(Boolean);

console.log(`=== 過去データ抽出 ===`);
console.log(`  local.json のコミット数: ${localCommits.length}`);
console.log(`  global.json のコミット数: ${globalCommits.length}`);

// local.json の履歴抽出
let localCount = 0;
for (const line of localCommits) {
  const [hash, commitDate] = line.split(' ');
  const content = extractFile(hash, 'data/local.json');
  if (!content) continue;

  let data;
  try { data = JSON.parse(content); } catch { continue; }

  // 日付決定: fetchedAt > timestamp > コミット日
  let dateStr;
  if (data.fetchedAt) {
    dateStr = toJSTDate(data.fetchedAt);
  } else if (data.timestamp && data.timestamp > 0) {
    dateStr = toJSTDate(data.timestamp);
  } else {
    dateStr = toJSTDate(commitDate);
  }

  // データが空でないか確認
  if (!data.items || data.items.length === 0) {
    console.log(`  skip local ${dateStr} (empty)`);
    continue;
  }

  const outPath = `data/history/local/${dateStr}.json`;
  if (existsSync(outPath)) {
    console.log(`  skip local ${dateStr} (already exists)`);
    continue;
  }

  writeFileSync(outPath, JSON.stringify(data));
  if (!index.local.includes(dateStr)) index.local.push(dateStr);
  localCount++;
  console.log(`  ✓ local ${dateStr} (${data.items.length}件, ${hash.slice(0, 7)})`);
}

// global.json の履歴抽出
let globalCount = 0;
for (const line of globalCommits) {
  const [hash, commitDate] = line.split(' ');
  const content = extractFile(hash, 'data/global.json');
  if (!content) continue;

  let data;
  try { data = JSON.parse(content); } catch { continue; }

  let dateStr;
  if (data.fetchedAt) {
    dateStr = toJSTDate(data.fetchedAt);
  } else if (data.timestamp && data.timestamp > 0) {
    dateStr = toJSTDate(data.timestamp);
  } else {
    dateStr = toJSTDate(commitDate);
  }

  if (!data.items || data.items.length === 0) {
    console.log(`  skip global ${dateStr} (empty)`);
    continue;
  }

  const outPath = `data/history/global/${dateStr}.json`;
  if (existsSync(outPath)) {
    console.log(`  skip global ${dateStr} (already exists)`);
    continue;
  }

  writeFileSync(outPath, JSON.stringify(data));
  if (!index.global.includes(dateStr)) index.global.push(dateStr);
  globalCount++;
  console.log(`  ✓ global ${dateStr} (${data.items.length}件, ${hash.slice(0, 7)})`);
}

// index.json をソートして保存
index.local.sort();
index.global.sort();
writeFileSync(indexPath, JSON.stringify(index, null, 2));

console.log();
console.log(`=== 完了 ===`);
console.log(`  local: ${localCount}件追加 (合計${index.local.length}件)`);
console.log(`  global: ${globalCount}件追加 (合計${index.global.length}件)`);
console.log(`  index.json 更新済み`);

# フォントサイズ・ガイドライン（mentemori.icu 準拠スケール）

**正本パス**: `E:/Dev/mentemori-gvg/docs/font-size-guideline.md`
**公開 URL**: https://github.com/harupo/mentemori-gvg/blob/main/docs/font-size-guideline.md
**最終更新**: 2026-05-15
**派生元**: mentemori-gvg (index.html 内コメントヘッダ) → 外出し化
**参照サイト**: https://mentemori.icu/weekly_chara.html — 同サイトの `td` を 14.4px 相当に揃えた読みやすさが基準

---

## 1. 適用範囲

Harupo の Web 系全成果物のフロントエンド UI（ダッシュボード / 管理画面 / 公開サイト全般）。

対象案件の例:
- mentemori-gvg (本ドキュメントの起点)
- LamentMania
- kimono-coord (repame v2)
- LCMS
- ClearManagementSystem
- 新規立ち上げの Web UI

非対象: 紙印刷物、メール HTML、ロゴ／ヒーロー画像内テキスト

## 2. 基準

- ベース: `1rem = 16px`（HTML root のブラウザデフォルト）
- ダークテーマ前提（明色テーマでも比率は同じ）
- 日本語フォント (`Noto Sans JP` 等) と数値モノスペース (`JetBrains Mono` 等) の混在を想定

## 3. スケール

| トークン | rem | px | 用途 |
|---|---|---|---|
| **xs** | 0.875rem | 14px | バッジ / 小ラベル / 脚注（**最小値・これより下げない**） |
| **sm** | 0.9rem | 14.4px | データテーブル本体セル（mentemori.icu/weekly_chara `td` に整合） |
| **base** | 1rem | 16px | 本文・タブ文言・主要ラベル |
| **md** | 1.125rem | 18px | サブ見出し |
| **lg** | 1.25rem | 20px | セクション見出し |
| **xl** | 1.5rem | 24px | グループ見出し |
| **2xl** | 2rem | 32px | ヒーロー数値 |

## 4. ルール

1. **14px (0.875rem) を絶対最小値**とする。これ以下にしない。
   - 旧運用は 12px 最小だったが、mentemori.icu 基準に揃え 14px に底上げ。
2. **データテーブル本体セル = 0.9rem (14.4px)**。`th` は同等 or 少し下げて 0.875rem も可。
3. **本文・タブラベル = 1rem (16px)**。標準ズームで読みやすい。
4. **色だけで意味を伝えない**（色覚多様性配慮）。属性タグはテキストラベル＋色のセット運用。
5. **数値 ID・桁揃え** は等幅フォント (`JetBrains Mono` 等) 使用 OK。ただし 14px 以上を維持。
6. **新規コード** はこのスケールから選ぶ。`0.7rem` 等の半端値を新設しない。
7. WCAG コントラスト: 通常テキスト 4.5:1 以上、18px 以上 or 14px 以上 700 weight は 3:1 以上。
8. タップ領域: スマホは最小 40×40px (Apple HIG 44px、Material 48px 準拠で 40 を最低ライン)。

## 5. CSS 共通スニペット（コピペ用）

CSS 変数で定義しておき、UI ルールはトークン参照で書く方針。

```css
:root {
  /* font-size scale (mentemori.icu reference-aligned) */
  --fs-xs:   0.875rem;   /* 14px   — floor */
  --fs-sm:   0.9rem;     /* 14.4px — table td */
  --fs-base: 1rem;       /* 16px   — body / tab label */
  --fs-md:   1.125rem;   /* 18px   — subheading */
  --fs-lg:   1.25rem;    /* 20px   — section heading */
  --fs-xl:   1.5rem;     /* 24px   — group heading */
  --fs-2xl:  2rem;       /* 32px   — hero metric */
}

body         { font-size: var(--fs-base); line-height: 1.6; }
table td     { font-size: var(--fs-sm); }
table th     { font-size: var(--fs-xs); }
.tab-btn     { font-size: var(--fs-base); }
.badge,
.footnote,
.label-sm    { font-size: var(--fs-xs); }
h3           { font-size: var(--fs-md); }
h2           { font-size: var(--fs-lg); }
h1           { font-size: var(--fs-xl); }
.hero-metric { font-size: var(--fs-2xl); }
```

## 6. オーバーライド方針

このドキュメントは**全 Web UI 案件の共通ベース**として機能する。ただし各プロジェクトには固有の事情（顧客要望、画面密度、印刷要件、業界慣習など）があり得るので、**プロジェクト側でのオーバーライドは正式に許可**する。

ルール:
1. オーバーライドはプロジェクトの `CLAUDE.md` の「UI フォントサイズ規約」セクション直下に **`### プロジェクト固有オーバーライド`** 見出しを作って明記する。
2. オーバーライドが書かれていない項目はこのベースに従う。
3. オーバーライドを書く際は **理由を 1 行併記**する（後任が判断できるように）。
4. オーバーライドが 3 件以上溜まったら、それは「業界別の別系統スケール」かもしれない。CoS に相談し、共通ベースの分岐 or 別ドキュメント化を検討する。

例:
```markdown
### プロジェクト固有オーバーライド
- Stat 数値は 2.5rem (40px) まで許容 — 経営ダッシュボードで遠目視認のため
- 印刷帳票 (`@media print`) は 10pt まで縮小可 — A4 1 枚レイアウト要件
```

## 7. 他プロジェクトの `CLAUDE.md` への組み込みスニペット

各プロジェクトの `E:/Dev/<dir>/CLAUDE.md` 末尾に以下を追記：

```markdown
## UI フォントサイズ規約

このプロジェクトの Web UI フロントは、以下を**ベースルール**として準拠する。

- 正本: https://github.com/harupo/mentemori-gvg/blob/main/docs/font-size-guideline.md
- ローカル参照: `E:/Dev/mentemori-gvg/docs/font-size-guideline.md`

**ベース**:
- 最小 **14px (0.875rem)** — これより小さくしない
- データテーブル本体 0.9rem (14.4px)
- 本文・タブ 1rem (16px)
- スケール: xs=14px / sm=14.4px / base=16px / md=18px / lg=20px / xl=24px / 2xl=32px
- CSS 変数 `--fs-xs / --fs-sm / --fs-base / --fs-md / --fs-lg / --fs-xl / --fs-2xl` を `:root` で定義し、要素はトークン参照で記述する

**プロジェクト固有オーバーライド**:
本プロジェクトでベースから外れる必要がある項目は、このブロック直下の `### プロジェクト固有オーバーライド` に**理由付きで列挙**する。書かれていない項目はベースに従う。

### プロジェクト固有オーバーライド
（現時点なし。必要に応じて追記）
```

## 8. 配布フロー（推奨）

横断管理は CoS (chief-of-staff) 経由が望ましい:

1. **本ドキュメントが正本**。更新は mentemori-gvg リポジトリ経由で行う。
2. CoS に「フォントサイズ規約更新」を伝え、各ラボの `CLAUDE.md` に §7 のブロックが入っているか確認してもらう。
3. 既存プロジェクトで適用済かは、各 PC (project coordinator) が新規 UI 作業時に確認・必要なら refactor PR を出す。
4. 既存の odd value (例: `0.7rem`, `13px` 直書き) を見つけたら、修正 PR の良い起点になる。
5. オーバーライド項目が業界別パターンとして共通化できそうなら CoS が分岐ドキュメントを起こす。

## 9. 改訂履歴

- 2026-05-15: mentemori-gvg `index.html` のヘッダコメントを外出し、汎用ドキュメント化
- 2026-05-15: WCAG コントラスト / タップ領域に関する記述を追加（a11y 修正リリース連動）
- 2026-05-15: オーバーライド方針を §6 に明示。ベースルール扱い、各プロジェクトで個別上書き可

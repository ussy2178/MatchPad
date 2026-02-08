# Football_LOG プロジェクト 改善レビュー

コンポーネント設計・状態管理・レスポンシブ設計・保守性の観点で改善点を整理しました。  
**実装確認済み**の箇所にはファイル名・行番号を併記しています。

---

## 1. コンポーネント設計

### 1.1 巨大コンポーネントの分割（WatchMode.tsx）

**現状:** `src/components/WatchMode/WatchMode.tsx` が 419 行あり、以下をすべて 1 ファイルで担当している。

- データ取得（snapshot / DB の分岐）
- ストップウォッチ・スコア・ピッチ・スカッド・イベントログ
- 複数モーダル（PlayerAction, Bench, Goal, Notes, Save 完了）
- イベント追加・削除・サマリー計算・保存

**推奨:**

- **WatchModeHeader**: ストップウォッチ + スコアパネル + Notes/Save ボタン
- **WatchModePitch**: HalfPitch 2 つ + ピッチ枠（`pitchSection` 部分）
- **SquadAccordion**: Home/Away で同じ構造のアコーディオンが 2 回繰り返されているため、`<SquadAccordion side="home" players={...} lineup={...} onPlayerClick={...} />` のような共通コンポーネントに抽出
- **EventLog**: イベント一覧 + 時間表示 + 削除ボタン（表示用ロジック・スタンプタイプの日本語マッピングもここに集約）
- **SaveSuccessModal**: 「Match Saved」のインライン JSX を `common/Modal` または専用の小さなモーダルコンポーネントに

これにより、テスト・変更影響の局所化・再利用がしやすくなる。

---

### 1.2 責務の分離（表示 vs ロジック）

**現状:**

- `WatchMode` 内で `getPlayer`, `getBenchPlayers`, `getSubbingTeamData`, `getTime`, `getActivePlayers`, スコア計算、`handleSaveMatch` のサマリー生成など、**ビジネスロジックと UI が密結合**している。
- `MatchCreationWizard` の `renderStep1_Info` / `renderCurrentTacticalBoard` はレンダー関数として同じファイル内にあり、ステップごとの「何を表示するか」が Wizard に直書きされている。

**推奨:**

- **カスタムフックにロジックを寄せる**
  - 例: `useWatchModeData(matchId, snapshot)` → `{ data, getPlayer, getTime, getBenchPlayers, ... }`
  - 例: `useMatchEvents(initialEvents)` → `{ events, addEvent, deleteEvent, homeScore, awayScore, buildSummary }`
- イベントの「表示用ラベル」マッピング（`Stamp` → パス/シュート/…）は `utils/eventLabels.ts` や定数ファイルに切り出し、`WatchMode` と `EventLog` の両方から参照する。

---

### 1.3 共通 UI の統一

**現状:**

- モーダル: `WatchMode` 内で `modalOverlay` + `modalContent` を直接書いている（Save 完了）。他では `common/Modal` を使用。
- ボタン: `style={{ fontSize: '0.85rem', padding: '6px 12px', ... }}` のようなインラインが `WatchMode` や `TeamList` にある。
- チームバッジ・スコア表示など、他画面でも使えそうなパターンが `WatchMode` 専用 CSS に閉じている。

**推奨:**

- 保存完了は `common/Modal` を使い、文言と OK コールバックだけ渡す形に統一。
- ボタンは `Button` の `variant` / `size` で表現し、インラインスタイルを減らす。
- スコアパネル（ホーム/アウェイ名 + スコア + ゴールボタン）を `ScorePanel` のような共通コンポーネントにし、Watch 以外（例: 試合カード）でも再利用できるようにする。

---

## 2. 状態管理

### 2.1 データソースの二重化（Dexie vs snapshot）【要修正】

**現状:**

- ウォッチ画面は「Dexie の match から取得」と「location.state の snapshot」の 2 パターンがある。
- **Stopwatch**（`WatchMode/Stopwatch.tsx` 24–26 行目）が `saveState` 内で無条件に `db.matches.update(matchId, { timerState })` を呼ぶ。snapshot 経由で入った場合、`matchId` は DB に存在しないため **更新が失敗し、タイマーが永続化されない／エラーになる**。
- **交代処理**（`WatchMode.tsx` 156–182 行目）の `handleSubstitution` が `db.matches.update(matchId, ...)` と `db.events.add(...)` を呼ぶ。snapshot モード時も同様に DB に存在しない match を更新しようとして失敗する。

**推奨:**

- タイマー状態を「DB のみ」にせず、**WatchMode のローカル state（または Context）で保持**し、保存時に `MatchRecord` の `snapshot.timerState` に含める形にする。
- または、snapshot のときは Stopwatch に `readOnly` を渡し、`saveState` を no-op にして UI だけ表示する。
- 交代についても、snapshot モードのときは DB 更新を行わず、`localEvents` と lineup のローカル更新だけにし、保存時に snapshot に反映する。

---

### 2.2 イベント状態の扱い

**現状:**

- イベントは `localEvents`（useState）のみで、Dexie の `events` テーブルには交代時のみ追加されている。
- そのため「ウォッチ画面で記録したパス・シュート・ゴール」は DB の `events` には残らず、保存時に `MatchRecord` の `events` と `playerSummary` として localStorage にのみ入る。

**推奨:**

- 「ウォッチ中のイベントはメモリ + 保存時に localStorage/Supabase」という方針なら、それをドキュメント（またはコメント）で明示する。
- もし「試合中も Dexie の events に随時追加」にしたい場合は、`addEvent` のたびに `db.events.add` するようにし、データソースを 1 つにそろえる。

---

### 2.3 型の重複とずれ

**現状:**

- `db/db.ts` の `MatchEvent`（Dexie 用）と `utils/matchStorage.ts` の `MatchEvent`（playerNumber, team, stampType など）が**別型**。WatchMode では後者を使っている。
- `EventType` が `db` と `matchStorage` で別定義・拡張（'Stamp', 'Goal' など）の可能性がある。

**推奨:**

- イベントの「アプリ全体で使う型」を 1 つにまとめる（例: `types/match.ts` または `db` の再エクスポート）。
- Dexie 用には `matchId`, `playerId`, `createdAt` など DB 用フィールドだけ追加した型を定義し、保存用の `MatchEvent` から変換するようにする。

---

### 2.4 グローバルな副作用のタイミング

**現状:**

- `App.tsx` の `useEffect` で `fixLegacyData()` と `syncPlayersToSupabase()` を無条件で実行している。初回マウント時に毎回走る。

**推奨:**

- 必要なら「初回のみ」「またはバージョン/タイムスタンプを見て間隔を空ける」などに制御する。
- 少なくとも `syncPlayersToSupabase` はユーザー操作（例: 設定の「同期」ボタン）か、バックグラウンドで遅延実行する形にすると、初回表示の体感が軽くなる。

---

## 3. レスポンシブ設計

### 3.1 ブレークポイントと変数の統一

**現状:**

- `1024px`（Formation）, `768px`（Layout, TeamDetailPage, NavigationLayer, Formation）, `600px`（Match）など、**ブレークポイントがファイルごとにバラバラ**（各所で数値が直書き）。
- `src/styles/variables.css` に `--breakpoint-md` 等のブレークポイント変数がなく、メディアクエリはすべて数値のまま。
- **WatchMode.module.css には @media が一切ない**。squadSection の 2 カラムやピッチ・スコアパネルが小画面でそのままになる。

**推奨:**

- `variables.css` に例: `--bp-sm: 600px;`, `--bp-md: 768px;`, `--bp-lg: 1024px;` を定義し、`@media (min-width: var(--bp-md))` で統一（または PostCSS 等で一括置換）。
- レイアウト方針（モバイル: 1 カラム、タブレット: 2 カラムなど）を 1 行だけ README やこのドキュメントに書いておくと、今後の変更がしやすい。

---

### 3.2 WatchMode のモバイル

**現状:**

- `WatchMode.module.css` に `squadSection` が `grid-template-columns: 1fr 1fr` で 2 カラム固定。小画面ではスカッドとイベントログが横並びのままになり、見づらい可能性がある。
- ピッチの `fullPitch` は `aspect-ratio: 105/68` で固定。縦長スマホではヘッダー・スコア・スカッドと合わせると縦スクロールが長くなる。

**推奨:**

- `squadSection` を `max-width: 600px` 以下で `grid-template-columns: 1fr` にし、Home/Away を縦積みにする。
- 必要なら、モバイルではスコアパネルをよりコンパクトにする（ロゴ非表示やフォントサイズ縮小）ためのメディアクエリを追加する。

---

### 3.3 タッチターゲット

**現状:**

- ピッチ上の `PlayerNode` は 60px（WatchMode.module.css の `.watchNode`）で問題なし。一方、**ゴールボタン**（`.goalBtn`）は **32x32px**（同 357–368 行）で、WCAG 推奨の 44x44px を下回る。
- 「Notes」「Save」ボタン（WatchMode.tsx 312–323 行）は `padding: 6px 12px` のインライン指定で、モバイルではタッチしづらい可能性がある。

**推奨:**

- モバイルでは `min-height: 44px`、`min-width: 44px` をボタンに適用する（共通 Button または module.css で）。

---

## 4. 保守性

### 4.1 CSS 変数の参照

**現状:**

- `variables.css` には `--color-bg-sub` が定義されている（12 行目）。各 module.css から正しく参照できていれば問題ない。
- 参照が効いていない場合は、`global.css` で `variables.css` の読み込み順や scope を確認する。

---

### 4.2 CSV パースの重複

**現状:**

- `src/services/dataLoader.ts` の `parsePlayerCSV` と `src/components/PlayerList/PlayerList.tsx` の `handleFileChange`（49–85 行）が**ほぼ同じロジック**（1 行目ヘッダー判定、name / jerseyNumber / position のパース）。

**推奨:**

- `utils/csvPlayers.ts` のようなファイルに `parsePlayerCSV(content: string): { name, jerseyNumber, position }[]` を 1 つ定義し、dataLoader と PlayerList の両方から import する。

---

### 4.3 マジックナンバー・文字列

**現状:**

- デフォルトチーム ID（`kashima-antlers`, `urawa-reds`）が `MatchCreationWizard.tsx` 59–60 行に直書き。
- イベントタイプの日本語マッピング（パス/シュート/…）が `WatchMode.tsx` 361–371 行の `map` オブジェクトに直書き。Stamp の `stampType` ごとの表示名がコンポーネント内に埋め込まれている。

**推奨:**

- デフォルトチームは `constants/defaults.ts` や `seeds` の先頭 2 件を参照するようにする。
- イベント表示名は `constants/eventLabels.ts` に集約し、`getEventDisplayLabel(type, stampType)` のような関数で返す。

---

### 4.4 デバッグ・開発用コード

**現状:**

- `hooks/usePlayers.ts` 内の `console.log`（Formation query / Players found）、`WatchMode.tsx` 117 行目の `console.log("WatchMode received click:", playerId)`、`MatchCreationWizard` の `debugTeamStorage()`（71 行）が本番にも残っている。

**推奨:**

- `if (import.meta.env.DEV)` でラップするか、削除する。少なくとも `console.log` は開発時のみに限定する。

---

### 4.5 エラーハンドリングとユーザーへのフィードバック

**現状:**

- `handleSaveMatch` 失敗時に `alert('Failed to save match')` のみ。
- チーム詳細や保存試合一覧では `window.confirm` / `alert` に頼っている。

**推奨:**

- トーストやスナックバー（軽量なライブラリ or 自作の `ToastContext`）を導入し、成功・失敗を一貫した UI で表示する。
- 確認ダイアログは `common/ConfirmDialog` のようなコンポーネントにし、見た目をアプリ全体で統一する。

---

### 4.6 テストのしやすさ

**現状:**

- ビジネスロジック（スコア計算、サマリー生成、CSV パース）がコンポーネントや hooks の内部にあり、単体テストしづらい。

**推奨:**

- 上記の「ロジックの切り出し」に合わせ、純粋関数（`computePlayerStats`, `buildMatchSummary`, `parsePlayerCSV`）をユニットテストする。
- コンポーネントは主要なユーザー操作（クリックでモーダルが開く、保存で履歴に追加されるなど）を React Testing Library でテストする。

---

## 5. 優先度の目安

| 優先度 | 項目 | 理由 |
|--------|------|------|
| 高 | WatchMode の snapshot 時の Stopwatch / 交代と DB の整合 | バグ・クラッシュの原因（Stopwatch.tsx L24–26, WatchMode.tsx L156–182） |
| 高 | イベント型の統一（MatchEvent） | 型安全性・保守性 |
| 中 | WatchMode のコンポーネント分割（SquadAccordion, EventLog 等） | 可読性・今後の機能追加 |
| 中 | CSV パースの共通化 | DRY・バグ修正の一元化 |
| 中 | レスポンシブのブレークポイント統一と WatchMode モバイル | UX・一貫性 |
| 低 | デフォルトチーム・イベントラベルの定数化 | 保守性 |
| 低 | console.log / debugTeamStorage の整理 | 本番品質 |
| 低 | トースト / 確認ダイアログの統一 | UX の一貫性 |

---

---

## 6. 実装確認メモ（レビュー時点）

- **variables.css**: `--color-bg-sub` は 12 行目で定義済み。
- **Stopwatch**: `saveState` が常に `db.matches.update(matchId, ...)` を呼ぶため、snapshot 由来の matchId のときは DB にレコードがなく失敗する。
- **WatchMode handleSubstitution**: snapshot 時も `db.matches.update` / `db.events.add` を使用しているため、同様に不整合が発生する。
- **WatchMode.module.css**: `@media` クエリが存在せず、squadSection は常に 2 カラム。小画面での縦積み対応は未実装。
- **ブレークポイント**: Layout 768px、Formation 768px/1024px、Match 600px など、ファイルごとに数値がばらついている。

このドキュメントを「やることリスト」として使いつつ、上から順に対応すると効果が大きいです。特定の項目を実装する際は、該当ファイルを開いて変更するとよいです。

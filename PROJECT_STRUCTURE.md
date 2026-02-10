# Football_LOG — ファイル構成と各ファイルの役割

サッカー・チーム管理・試合観戦メモアプリ「MatchPad」のプロジェクト構成です。  
**React + Vite + Dexie（IndexedDB）+ Supabase** で構成されています。

---

## 1. ルート直下のファイル

| ファイル | 役割 |
|----------|------|
| `index.html` | エントリーHTML。`<div id="root">` と `main.tsx` の読み込み。タイトルは「MatchPad」。 |
| `package.json` | 依存関係（React 19, react-router-dom, Dexie, Supabase, Vite など）とスクリプト（dev / build / lint）。 |
| `vite.config.ts` | Vite のビルド設定。 |
| `tsconfig.json` / `tsconfig.app.json` / `tsconfig.node.json` | TypeScript の設定。 |
| `eslint.config.js` | ESLint の設定。 |

---

## 2. エントリーポイントとルーティング

### `src/main.tsx`
- React のエントリー。`createRoot` で `App` をマウント。
- 起動時に **`loadInitialData()`** を実行し、`data/players/*.csv` から選手データを Dexie に投入（非同期・非ブロッキング）。
- グローバルCSS（`styles/global.css`）を最初に読み込む。

### `src/App.tsx`
- **react-router-dom** でルートを定義。
- **RootLayout**: 全ページで `NavigationLayer`（HOME / Back）を表示し、`<Outlet />` で子ルートを描画。
- マウント時に **`fixLegacyData()`**（チームID・選手名の正規化）と **`syncPlayersToSupabase()`**（選手の Supabase 同期）を実行。

**ルート一覧**

| パス | 表示内容 |
|------|----------|
| `/` | チーム一覧（`TeamList`） |
| `/team/:teamId` | チーム詳細（試合履歴 + 選手リスト） |
| `/match/new` | 試合作成ウィザード（`MatchCreationWizard`） |
| `/match/:matchId/watch` | 試合ウォッチモード（`WatchMode`） |
| `/saved-matches` | 保存試合一覧 |
| `/stats` | 統計ページ（Supabase の試合データから集計） |

---

## 3. データ層（DB・型・シード）

### `src/db/db.ts`
- **Dexie** で IndexedDB をラップ。DB 名は `J1ManagerDB`。
- **テーブル**: `teams`, `players`, `matches`, `events`。
- **型定義**: `Team`, `Player`, `Match`, `TimerState`, `MatchEvent`, `EventType`。
- バージョン管理でスキーマ変更（チーム再シード、matches/events 追加、players の複合インデックスなど）を実施。
- `db.on('populate')` で初回にチームをシード。

### `src/db/seeds.ts`
- **J1 チームのマスタデータ**（`J1_TEAMS`）。`id`, `name`, `logoPath`（`/logos/xxx.png`）。
- 鹿島、浦和、川崎、横浜FM、ガンバ、セレッソ、アビスパ福岡 など。

---

## 4. フック（データ取得・選手CRUD）

### `src/hooks/useTeams.ts`
- **useTeams()**: 全チームを名前順で取得（`useLiveQuery`）。
- **useTeam(teamId)**: 1チームを取得。チーム詳細ページで使用。

### `src/hooks/usePlayers.ts`
- **usePlayers(teamId)**: 指定チームの選手を背番号順で取得（`useLiveQuery`）。`idUtils.normalizeTeamId` で teamId を正規化。
- **playerService**: 選手の追加・更新・削除・一括インポート。背番号の重複チェック、`idUtils` による正規化あり。

---

## 5. サービス（データ読み込み・外部連携）

### `src/services/dataLoader.ts`
- **loadInitialData()**: `data/players/*.csv` を Vite の `import.meta.glob` で取得し、パースして `playerService.importPlayers(teamId, players)` で Dexie に投入。ファイル名から teamId（例: `kashima-antlers`）を決定し、`seeds` に存在するチームのみ処理。

### `src/services/playerSync.ts`
- **syncPlayersToSupabase()**: ローカル Dexie の全選手を Supabase の `football_players` テーブルに同期（fire-and-forget）。`lib/supabase` が未設定の場合はスキップ。

### `src/services/supabaseBackup.ts`
- **backupMatchToSupabase(match)**: 試合保存時に、試合概要を `football_matches` に、イベントを `match_events` 相当に保存。`matchStorage.saveMatch` 内から呼ばれる。

---

## 6. ユーティリティ

### `src/utils/idUtils.ts`
- **normalizeTeamId(id)**: トリム・小文字化。
- **normalizePosition(pos)**: ポジション文字列を標準化（"MF", "DF" など）。
- **cleanString(value)**: 前後のクォート除去・トリム。
- **fixLegacyData()**: 既存選手の teamId・name を正規化するマイグレーション。App 起動時に実行。

### `src/utils/matchStorage.ts`
- 保存試合の **localStorage** 入出力（キー: `savedMatches`）。
- **getSavedMatches()**, **saveMatch(record)**, **deleteMatch(id)**, **getMatchById(id)**。
- **型**: `MatchRecord`, `WatchModeState`, `MatchEvent`, `PlayerStats`, `MatchNotes`。
- **computePlayerStats(events)**: イベント配列から選手ごとのスタッツ（パス・シュート・ゴール等）を集計。
- `saveMatch` 内で **backupMatchToSupabase** を呼び出し。

### `src/utils/storageDebug.ts`
- デバッグ用。チーム・選手のストレージ状態をコンソール出力。`MatchCreationWizard` で使用。

---

## 7. 定数

### `src/constants/formations.ts`
- **FORMATIONS**: フォーメーション名をキーに、ピッチ上のポジション座標（id, x, y, label）を定義。  
  `4-4-2`, `4-3-3`, `3-4-2-1`, `5-3-2`, `3-5-2`, `4-2-3-1` をサポート。
- **FormationName**: 上記キーの型。

---

## 8. ページ

### `src/pages/TeamDetailPage.tsx`
- パス: `/team/:teamId`。`useTeam(teamId)` でチーム情報取得。
- **Match History**: `matchStorage.getSavedMatches()` で当該チームが関わる試合をフィルタして表示。`MatchCard` で一覧し、削除対応。
- **選手リスト**: `PlayerList` を `embedded` で表示（ヘッダーなし）。

### `src/pages/SavedMatchesPage.tsx`
- パス: `/saved-matches`。保存済み試合を一覧表示。削除・「Watch」でウォッチ画面へ遷移。

### `src/pages/StatsPage.tsx`
- パス: `/stats`。Supabase の `players` と試合の `player_summary` を参照し、選手ごとのゴール数・イベント数を集計して表示。

---

## 9. 共通コンポーネント（`src/components/common/`）

| ファイル | 役割 |
|----------|------|
| `Layout.tsx` + `Layout.module.css` | 共通レイアウト（ヘッダー・余白）。チーム一覧・保存試合・チーム詳細・統計で使用。 |
| `NavigationLayer.tsx` + `.module.css` | トップ以外のページで「HOME」「← Back」ボタンを表示。 |
| `Button.tsx` + `Button.module.css` | 汎用ボタン。 |
| `Input.tsx` + `Input.module.css` | 汎用入力。 |
| `Modal.tsx` + `Modal.module.css` | 汎用モーダル。 |
| `Select.tsx` | セレクトボックス（スタイルは別またはインライン）。 |

---

## 10. チーム・選手まわり

### `src/components/TeamList/TeamList.tsx` + `.module.css`
- トップページで表示。Dexie のチーム一覧をカードで表示し、クリックで `/team/:teamId` へ遷移。ロゴ・チーム名を表示。

### `src/components/PlayerList/PlayerList.tsx` + `.module.css`
- チーム詳細ページで使用。`usePlayers(teamId)` で選手を取得し、一覧表示。`embedded` でヘッダーを出さないモードあり。

### `src/components/PlayerForm/PlayerForm.tsx` + `.module.css`
- 選手の追加・編集フォーム（名前・背番号・ポジション）。`playerService` と連携。

### `src/components/players/AddPlayerModal.tsx`
- 選手追加用モーダル。`PlayerForm` を内包し、追加後に閉じる。

---

## 11. フォーメーション（`src/components/Formation/`）

| ファイル | 役割 |
|----------|------|
| `TacticalBoard.tsx` | ホーム/アウェイのピッチを横並びで表示。フォーメーション選択・ラインナップ割り当てを担当。 |
| `Pitch.tsx` | 1枚のピッチ（芝部分）。`PlayerNode` を配置。 |
| `PlayerNode.tsx` | ピッチ上の1選手ノード（ドラッグ可能・クリックで選手選択）。 |
| `SquadPanel.tsx` | チームの選手リストからラインナップに割り当てるためのパネル。 |
| `FormationEditor.tsx` | フォーメーション編集の論理（必要に応じて TacticalBoard から利用）。 |
| `Formation.module.css` | フォーメーション関連のスタイル。 |

`constants/formations.ts` の座標に従ってポジションが描画され、`Match` の `homeLineup` / `awayLineup`（positionIndex → playerId）と連動します。

---

## 12. 試合作成・試合カード（`src/components/Match/`）

### `MatchCreationWizard.tsx` + `Match.module.css`
- パス: `/match/new`。ステップ形式で試合を作成。
  - ホーム/アウェイチーム・日付・キックオフ時刻の入力。
  - ホーム側フォーメーション・ラインナップ設定（`TacticalBoard`）。
  - アウェイ側フォーメーション・ラインナップ設定。
- 保存時に Dexie の `db.matches` に保存し、`/match/:matchId/watch` へ遷移。

### `MatchCard.tsx` + `MatchCard.module.css`
- 試合のサマリー表示（日付・ホーム/アウェイ・スコアなど）。「Watch」「Delete」ボタン。`SavedMatchesPage` や `TeamDetailPage` で使用。

---

## 13. ウォッチモード（`src/components/WatchMode/`）

試合観戦中のメイン画面（`/match/:matchId/watch`）。

| ファイル | 役割 |
|----------|------|
| `WatchMode.tsx` + `WatchMode.module.css` | メインコンポーネント。Dexie の match と snapshot の両方に対応。ストップウォッチ・ハーフピッチ・イベント記録・ゴール・メモ・保存の流れを統合。 |
| `Stopwatch.tsx` | 試合時間（1H / 2H / HT / FT）。一時停止・再開・経過時間の管理。 |
| `HalfPitch.tsx` | ウォッチ用のハーフピッチ表示（選手配置の可視化）。 |
| `PlayerActionModal.tsx` | 選手を選んでアクション（パス・シュート・ディフェンス等）を記録するモーダル。 |
| `GoalModal.tsx` | ゴール記録用モーダル（ホーム/アウェイ・得点者など）。 |
| `BenchModal.tsx` | 交代・ベンチ関連のモーダル。 |
| `NotesModal.tsx` | 前半・後半・試合全体のメモ入力。 |

保存時は `matchStorage.saveMatch` で `MatchRecord`（スコア・イベント・選手サマリー・スナップショット・メモ）を localStorage に書き、`backupMatchToSupabase` で Supabase に送信します。

---

## 14. 保存試合一覧コンポーネント

### `src/components/SavedMatches/SavedMatchesList.tsx`
- 保存試合の一覧表示用コンポーネント（`SavedMatchesPage` から利用される可能性あり。ページ側で直接 `MatchCard` を並べている場合は補助的）。

---

## 15. スタイル・静的アセット

### `src/styles/`
- **global.css**: アプリ全体のベーススタイル。
- **variables.css**: CSS 変数（色・フォント等）。

### `src/lib/supabase.ts`
- Supabase クライアントの初期化。環境変数で無効化可能。選手同期・試合バックアップ・統計で使用。

### `public/`
- **logos/**: 各チームのロゴ画像（PNG）。`/logos/xxx.png` で参照。
- **icon-192.png**, **icon-512.png**: PWA 用アイコン。
- **vite.svg**: ファビコン等。

### `data/players/`
- チーム別選手 CSV（`kashima-antlers.csv`, `urawa-reds.csv` など）。  
  列: 名前, 背番号, ポジション（GK/DF/MF/FW）。  
  **dataLoader** が起動時に読み込み、Dexie に投入。

---

## 16. データの流れ（まとめ）

1. **起動時**: `main.tsx` → `loadInitialData()` で CSV から選手投入。`App` → `fixLegacyData()` + `syncPlayersToSupabase()`。
2. **チーム一覧**: `useTeams()` → Dexie `teams`。
3. **チーム詳細**: `useTeam(teamId)` + `usePlayers(teamId)` + `getSavedMatches()` で試合フィルタ。
4. **試合作成**: `MatchCreationWizard` で `db.matches.add()` → ウォッチ画面へ。
5. **ウォッチ**: Dexie の `matches` または location.state の snapshot を元に、イベントをメモリで保持し、保存時に `saveMatch()` → localStorage + Supabase。
6. **保存試合・統計**: localStorage の `savedMatches` と Supabase の `football_matches` / 集計用テーブルを参照。

---

このドキュメントを参照すると、編集したい機能がどのファイルに属しているかすぐに把握できます。  
特定の機能を変更したい場合は、上記の表から該当するファイルを開いて編集してください。

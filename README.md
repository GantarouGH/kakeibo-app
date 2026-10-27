# Kakeibo Dashboard

マネーフォワード ME の「収入・支出詳細_*.csv」を可視化するダッシュボード（Vite + React + TypeScript + Chart.js）。

## 起動

```bash
cd ~/GensparkCode/kakeibo-app
npm run dev          # http://localhost:5180 が自動で開きます
```

または Finder で `Kakeibo Dashboard.command` をダブルクリック。

- データフォルダ: `~/Library/CloudStorage/Dropbox/Kakeibo`（`KAKEIBO_DIR=/path npm run dev` で変更可）
- フォルダに CSV を追加・上書きすると画面が自動更新されます（ヘッダーの「Live」表示）
- テーマ: Auto（システム連動）/ Light / Dark

## スマホ版（Dropbox 直結 / GitHub Pages）

公開版はブラウザが Dropbox API から直接 CSV を読みます（サーバー不要・Mac の電源 OFF でも可）。
コードは公開されますが、家計簿データは各端末のブラウザ内にのみ保存されます。

1. https://www.dropbox.com/developers/apps → Create app
   - Scoped access / **Full Dropbox** / 名前は任意
   - Permissions: `files.metadata.read`, `files.content.read` → Submit
   - Settings → OAuth2 → Redirect URIs に追加:
     - `https://<GitHubユーザー名>.github.io/kakeibo-app/`
     - `http://localhost:5180/`（Mac での動作確認用: `http://localhost:5180/?dropbox`）
   - App key を控える（公開して問題ない値です）
2. GitHub リポジトリ `kakeibo-app` に push
   - Settings → Pages → Source: **GitHub Actions**
   - Settings → Secrets and variables → Actions → Variables → `DROPBOX_APP_KEY` = App key
3. スマホで `https://<GitHubユーザー名>.github.io/kakeibo-app/` を開き「Dropbox で認証」
   - Safari: 共有 → ホーム画面に追加 でアプリのように使えます

## 構成

| パス | 役割 |
|---|---|
| `server/kakeibo.ts` | Vite プラグイン。CSV(Shift_JIS)読込 → `/api/data`、フォルダ監視 → 自動更新通知 |
| `src/lib/finance.ts` | 集計ロジック（計算対象=1 かつ 振替=0 を集計） |
| `src/hooks/` | データ取得 / テーマ |
| `src/components/` | 各カード |

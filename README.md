# meeting-eval-api

Google Meet の会議議事録（Google Docs）を起点に、Google Calendar のイベントと照合し、Supabase に登録後、Google Gemini で会議評価・個人評価を行い、メール送信用のレポートを生成する REST API。

## 技術スタック

- **Runtime:** Node.js 20+
- **Language:** TypeScript (strict mode)
- **Framework:** Express
- **DB:** Supabase (PostgreSQL)
- **外部API:** Google Docs API, Google Calendar API, Google Gemini API, QuickChart
- **デプロイ:** Google Cloud Run (Docker)
- **テスト:** Vitest

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .env を編集して必要な値を設定

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# テスト実行
npm test
```

## 環境変数

### 必須

| 変数名 | 説明 |
|--------|------|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google サービスアカウントの JSON キー |
| `GEMINI_API_KEY` | Google Gemini API キー |
| `SUPABASE_URL` | Supabase プロジェクト URL |
| `SUPABASE_SERVICE_KEY` | Supabase サービスキー |
| `API_KEY` | この API の認証キー |

### オプション

| 変数名 | デフォルト値 | 説明 |
|--------|------------|------|
| `CALENDAR_ID` | `ren.fujioka@novagrid.tech` | Google Calendar ID |
| `CALENDAR_LOOKBACK_DAYS` | `14` | カレンダーイベント検索の遡り日数 |
| `QUICKCHART_BASE_URL` | `https://quickchart.io` | QuickChart API の URL |
| `PORT` | `8080` | サーバーポート |
| `DRIVE_FOLDER_ID` | - | Google Drive フォルダ ID |
| `ADMIN_EMAIL` | - | エラー通知先メールアドレス |

## API エンドポイント

### `POST /api/process-meeting`

会議議事録を処理してレポートを生成する。

**認証:** `Authorization: Bearer <API_KEY>` または `x-api-key: <API_KEY>`

**リクエスト:**
```json
{
  "fileId": "Google Docs のドキュメント ID"
}
```

**レスポンス:**
```json
{
  "ok": true,
  "meetInstanceKey": "eventId__startTime",
  "attendees": [...],
  "meetingReport": {
    "to": ["email1@example.com"],
    "subject": "会議評価レポート: ...",
    "html": "...",
    "text": "...",
    "chartUrl": "..."
  },
  "individualReports": [...]
}
```

### `GET /health`

ヘルスチェック。

### `GET /api/meeting/:meetInstanceKey`

デバッグ用。指定した会議のデータを Supabase から取得。

## DB マイグレーション

```bash
# Supabase の SQL エディタで実行
cat sql/migrations/001_create_tables.sql
```

## Docker

```bash
# ビルド
docker build -t meeting-eval-api .

# 実行
docker run -p 8080:8080 --env-file .env meeting-eval-api

# docker-compose
docker compose up
```

## 処理フロー

1. Google Docs から会議議事録を取得
2. 文字起こしタブから transcript と eid を抽出
3. Google Calendar イベントと eid で照合
4. `row_meeting_raw` に UPSERT
5. 参加者情報を `tf_meeting_attendee` に UPSERT
6. Gemini で会議全体の評価を実行
7. Gemini で参加者ごとの個人評価を順次実行
8. HTML/テキストのレポートを生成して返却

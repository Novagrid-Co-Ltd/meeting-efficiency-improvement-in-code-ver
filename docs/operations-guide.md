# 運用手順書: 会議評価システム

---

## システム概要

Google Meet の文字起こしドキュメントを取得し、LLM（OpenAI/Gemini）で会議・個人評価を自動生成するシステム。

### 構成

| コンポーネント | 場所 |
|--------------|------|
| API サーバー | Cloud Run (`meeting-eval-api`) |
| URL | `https://meeting-eval-api-tb7frvs53q-an.a.run.app` |
| DB | Supabase (`vswrfihgqthkjmqwezb`) |
| GCPプロジェクト | `striped-torus-484407-d0` |
| リージョン | `asia-northeast1` |

### 認証モード

| モード | 条件 | アクセス範囲 |
|--------|------|-------------|
| Legacy OAuth | `GOOGLE_SA_CREDENTIALS` 未設定 | `ren.fujioka@novagrid.tech` のみ |
| SA + 委任 | `GOOGLE_SA_CREDENTIALS` 設定済み | 全社員のDrive/Calendar/Docs |

---

## 日常運用

### 1. 単一ファイルの処理（API経由）

n8n等の外部トリガーから呼ばれる通常のフロー。

```bash
curl -X POST https://meeting-eval-api-tb7frvs53q-an.a.run.app/api/process-meeting \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{"fileId": "<Google DocsのファイルID>"}'
```

SA + 委任モード時は `calendarEmail` で特定ユーザーのカレンダーを指定可能:

```bash
curl -X POST .../api/process-meeting \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{"fileId": "xxx", "calendarEmail": "user@novagrid.tech"}'
```

### 2. バックフィル（1ユーザーのDriveフォルダ）

`DRIVE_FOLDER_ID` に指定したフォルダ内の未処理ドキュメントを一括処理。

```bash
# ドライラン（対象一覧のみ表示、処理しない）
npm run backfill:dry

# 本実行
npm run backfill
```

### 3. 全社スキャン（SA + 委任モード限定）

全社員のDriveを走査して未処理の文字起こしドキュメントを発見・処理。

```bash
# ドライラン（対象一覧のみ表示、処理しない）
npm run orgwide-scan:dry

# 本実行
npm run orgwide-scan
```

**処理フロー:**
1. Admin SDK で全ドメインユーザー取得（suspended/archived は除外）
2. 各ユーザーの Drive を走査（クエリ: `名前に「文字起こし」を含む Google Docs`）
3. ドキュメントからイベントID（eid）を抽出
4. そのユーザーのカレンダーからイベントをマッチ
5. 未処理なら評価パイプラインを実行
6. 重複は meetInstanceKey で排除

**レートリミット対策:**
- ユーザー間: 2秒インターバル
- ファイル間: 0.5秒インターバル

### 4. 月次レポート

```bash
curl -X POST .../api/monthly-report \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{"year": 2026, "month": 3}'
```

---

## デプロイ

### Cloud Run へのデプロイ

```bash
# ビルド & デプロイ（asia-northeast1）
gcloud run deploy meeting-eval-api \
  --source . \
  --project striped-torus-484407-d0 \
  --region asia-northeast1
```

### SA + 委任モードを有効にする場合の追加環境変数

```bash
# Secret Manager にSAキーJSONを格納
gcloud secrets create meeting-eval-sa-key \
  --project=striped-torus-484407-d0 \
  --data-file=sa-key.json

# Cloud Run に環境変数を追加
gcloud run services update meeting-eval-api \
  --project=striped-torus-484407-d0 \
  --region=asia-northeast1 \
  --set-secrets="GOOGLE_SA_CREDENTIALS=meeting-eval-sa-key:latest" \
  --update-env-vars="GOOGLE_IMPERSONATE_EMAIL=admin@novagrid.tech,WORKSPACE_DOMAIN=novagrid.tech"
```

---

## 環境変数一覧

### 必須（共通）

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `SUPABASE_URL` | Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase サービスキー | `eyJ...` |
| `API_KEY` | APIエンドポイントの認証キー | ― |

### Google認証（どちらか一方）

**OAuth モード（従来）:**

| 変数名 | 説明 |
|--------|------|
| `GOOGLE_CLIENT_ID` | OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | OAuth クライアントシークレット |
| `GOOGLE_REFRESH_TOKEN` | リフレッシュトークン |

**SA + 委任モード（全社アクセス）:**

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `GOOGLE_SA_CREDENTIALS` | SAキーJSON文字列 | `{"type":"service_account",...}` |
| `GOOGLE_IMPERSONATE_EMAIL` | 委任時のデフォルト管理者 | `admin@novagrid.tech` |
| `WORKSPACE_DOMAIN` | ドメイン名 | `novagrid.tech` |

### オプション

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `CALENDAR_ID` | `ren.fujioka@novagrid.tech` | デフォルトのカレンダーID |
| `DRIVE_FOLDER_ID` | ― | backfill対象のDriveフォルダID |
| `ADMIN_EMAIL` | ― | エラー通知先メール |
| `CALENDAR_LOOKBACK_DAYS` | `14` | カレンダー検索の遡り日数 |
| `LLM_PROVIDER` | `gemini` | `gemini` or `openai` |
| `GEMINI_API_KEY` | ― | Gemini APIキー |
| `OPENAI_API_KEY` | ― | OpenAI APIキー |
| `PORT` | `8080` | サーバーポート |

---

## トラブルシューティング

### SA認証エラー

```
Error: Neither SA credentials nor OAuth credentials are configured.
```
→ `GOOGLE_SA_CREDENTIALS` も OAuth系の変数も設定されていない。どちらかを設定する。

### ドメイン全体の委任エラー

```
Error: unauthorized_client
```
→ Google Admin Console でクライアントID `115030901961606673133` にスコープが許可されていない。`sa-setup-guide.md` の手順2を確認。

### キー期限切れ

```
Error: invalid_grant
```
→ SAキーが期限切れ。GCP Console でキーを再発行し、`GOOGLE_SA_CREDENTIALS` を更新する。

現在のキー期限: **2026/3/15**（要更新）

### 全社スキャンで特定ユーザーがスキップされる

→ 以下の原因が考えられる:
- ユーザーが suspended / archived
- ユーザーの Drive に「文字起こし」を含むドキュメントがない
- カレンダーイベントとマッチしない（eid 不一致）

### レートリミットエラー (429)

→ `orgWideScan.ts` の `INTERVAL_MS` / `FILE_INTERVAL_MS` を増やす。

---

## SAキーのローテーション

SAキーには有効期限がある。期限前に以下の手順で更新:

1. GCP Console → IAMと管理 → サービスアカウント → `meeting-eval-api` → キータブ
2. 「鍵を追加」 → JSON → ダウンロード
3. Secret Manager を更新:
   ```bash
   gcloud secrets versions add meeting-eval-sa-key \
     --project=striped-torus-484407-d0 \
     --data-file=new-sa-key.json
   ```
4. Cloud Run を再デプロイ（Secretの最新版が自動反映）
5. 古いキーを GCP Console から削除

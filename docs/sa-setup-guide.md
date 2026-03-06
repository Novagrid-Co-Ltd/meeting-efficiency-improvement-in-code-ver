# セットアップ手順書: サービスアカウント + ドメイン全体委任

> **対象者**: GCP / Google Workspace 管理者権限を持つ方（代表）
> **所要時間**: 約10分
> **目的**: 会議評価システムが全社員のDrive・Calendar・Docsにアクセスできるようにする

---

## 前提: 既存のサービスアカウント

以下のSAが作成済み。**新規作成は不要**。

| 項目 | 値 |
|------|-----|
| SA名 | `meeting-eval-api` |
| メール | `meeting-eval-api@striped-torus-484407-d0.iam.gserviceaccount.com` |
| クライアントID | `115030901961606673133` |
| GCPプロジェクト | `striped-torus-484407-d0` |

---

## 手順1: ドメイン全体の委任を有効にする（GCP側）

1. [GCP Console](https://console.cloud.google.com/) にログイン
2. プロジェクト **`striped-torus-484407-d0`** を選択
3. **IAMと管理** → **サービスアカウント** → `meeting-eval-api` をクリック
4. **「詳細設定を表示」** → **「ドメイン全体の委任を有効にする」** にチェック → 保存

> 既に有効であればスキップしてOK

---

## 手順2: Google Admin Console でスコープを許可

1. [Google Admin Console](https://admin.google.com/) に**管理者アカウント**でログイン
2. **セキュリティ** → **アクセスとデータ管理** → **API制御**
3. **「ドメイン全体の委任を管理」** をクリック
4. **「新しく追加」** をクリック（既に登録済みなら編集）
5. 以下を入力:

| 項目 | 値 |
|------|-----|
| クライアントID | `115030901961606673133` |
| OAuthスコープ | 下記をそのままコピー&ペースト |

```
https://www.googleapis.com/auth/drive.readonly,https://www.googleapis.com/auth/documents.readonly,https://www.googleapis.com/auth/calendar.readonly,https://www.googleapis.com/auth/admin.directory.user.readonly
```

6. **「承認」** をクリック

### スコープの説明（すべて読み取り専用）

| スコープ | 用途 |
|---------|------|
| `drive.readonly` | 各ユーザーのDriveから文字起こしファイルを検索 |
| `documents.readonly` | Google Docsの内容を読み取り |
| `calendar.readonly` | カレンダーイベントとの照合 |
| `admin.directory.user.readonly` | ドメイン内ユーザー一覧の取得 |

---

## 手順3: SAキーの更新

現在のキーは **2026/3/15 に期限切れ** のため、新しいキーを作成する。

1. GCP Console → **IAMと管理** → **サービスアカウント** → `meeting-eval-api`
2. **「キー」タブ** → **「鍵を追加」** → **「新しい鍵を作成」** → **JSON**
3. ダウンロードされたJSONファイルを開発担当に渡す

> 古いキー（ID: `8d7fde2e...`）は新キーの動作確認後に削除してOK

---

## 手順4: 管理者メールアドレスの確認

SA委任で Admin SDK を使う際、管理者権限を持つユーザーとして API を呼び出す必要がある。

**`GOOGLE_IMPERSONATE_EMAIL` に設定するメールアドレスを教えてください。**

条件:
- Google Workspace の **特権管理者** または **ユーザー管理の管理者** 権限を持つアカウント
- 例: `代表のメールアドレス@novagrid.tech`

---

## 完了後の確認

手順1〜4が完了したら、開発担当が以下で動作確認を行う:

```bash
# ドライラン: ユーザー一覧取得 + 対象ファイル検出（処理は実行しない）
npm run orgwide-scan:dry
```

正常に動作すれば、全社員のユーザー一覧と未処理の文字起こしドキュメントが表示される。

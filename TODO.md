# TODO

## 完了済み
- [x] Phase 1: プロジェクトスキャフォールディング (package.json, tsconfig, Dockerfile, etc.)
- [x] Phase 2: Config + 型定義 (config.ts, types/)
- [x] Phase 3: Utils + テスト (jsonSanitizer, emailNormalizer, logger)
- [x] Phase 4: DBマイグレーション (6テーブル定義)
- [x] Phase 5: Services (Google Docs, Calendar, Supabase, Gemini/OpenAI, ChartGenerator)
- [x] Phase 6: プロンプトテンプレート (meetingEval, individualEval) ※プレースホルダー
- [x] Phase 7: ロジック + テスト (extractTranscript, matchEvent, buildAttendees, etc.)
- [x] Phase 8: Routes + エントリポイント (processMeeting, health, debug, index.ts)
- [x] Phase 9: README更新
- [x] OAuth2認証対応 (ServiceAccount → OAuth2Client)
- [x] OpenAI LLM対応 (LLM_PROVIDER切替: gemini / openai)
- [x] n8nワークフローJSON作成 (Google Drive Trigger → API → Gmail)
- [x] E2Eテスト疎通確認 (n8n → Cloudflare Tunnel → ローカルAPI → 全パイプライン成功)

## 未着手
- [ ] プロンプト本番化: n8nの実プロンプトを移植 (meetingEval.ts, individualEval.ts)
- [ ] master_person_identity テーブルへの初期データ投入 (社員名・メール)
- [ ] Cloud Run デプロイ (Dockerfile → GCR → Cloud Run)
- [ ] Cloud Run デプロイ後、n8nのURLをCloudflare TunnelからCloud Run URLに変更
- [ ] エラーハンドリング改善 (Google Docs API 404時のわかりやすいエラーメッセージ)
- [ ] ユーザーからの改善フィードバック対応 (後日受領予定)

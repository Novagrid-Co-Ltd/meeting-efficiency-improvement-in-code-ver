# PJ Hub 開発指示書

## 開発方針
**UI先行アプローチ**で進める。まずフロントエンドのUIをモック（ダミーデータ）で作り、画面を確認しながらバックエンドを実装していく。UIは作り込まず、機能が動くことを優先する。

## プロジェクト概要
既存の `meeting-efficiency-improvement-in-code-ver` リポジトリに、PJ Hub機能を追加する。
会議の議事録からTODO・決定事項・課題・フェーズ変化をAI（Gemini）で自動抽出し、プロジェクト別に管理するWebアプリ。

## 技術スタック
- バックエンド: TypeScript / Express（既存）
- フロントエンド: Vite + React + TypeScript + TailwindCSS（新規追加）
- DB: Supabase（既存）
- AI: Google Gemini（既存）
- デプロイ: Cloud Run

---

## Step 1: フロントエンドのセットアップ＋全画面モック

### やること
`frontend/` ディレクトリを作成し、Vite + React + TypeScript + TailwindCSS + React Router でセットアップ。
以下の画面をすべてダミーデータで作成する。バックエンドAPIはまだ不要。

### 画面一覧

#### 1-1. PJ一覧ページ (`/projects`)
- プロジェクトカードを一覧表示
- 各カードに: PJ名、ステータスバッジ（active/on_hold/completed）、未確認アイテム数バッジ、フェーズ進捗（現在のフェーズ名）
- 「+ 新規PJ作成」ボタン

#### 1-2. PJ登録ページ (`/projects/new`)
- フォーム:
  - PJ名（必須）
  - Calendarキーワード（必須、複数入力可 - タグ入力UI）
  - 説明（任意）
  - 開始日・終了予定日（任意）
  - メンバー追加（プルダウンからメンバー選択 → role入力。ダミーのメンバーリストを使う）
  - フェーズ追加（複数行: フェーズ名 + 開始日 + 終了予定日。行の追加・削除・並び替え可能）

#### 1-3. PJ詳細ページ (`/projects/:id`) - タブ構成

**タブ①: ガントチャート**
- フェーズを横棒バーで表示（start_date 〜 end_date）
- 予定バー（薄い色）と実績バー（濃い色、actual_end_dateまで）を重ねて表示
- マイルストーンを◆マーカーで表示（pending=黄色、achieved=緑）
- 今日線（縦の点線）
- 遅延フェーズは赤く表示（actual_end_date > end_date）
- ※ライブラリ選定は任意（素のCSS/SVG、またはReact用ガントライブラリ）

**タブ②: 概要**
- PJ名、説明、ステータス、開始日〜終了日
- メンバー一覧（名前 + role）
- すべてインライン編集可能（クリックで編集モードになる）

**タブ③: TODO・決定事項・課題**
- AI抽出アイテムの一覧
- フィルタ: ステータス（draft / confirmed / all）、種別（todo / decision / issue / phase_change）
- 各行の表示: 種別バッジ | 内容 | 担当者 | 期日 | 優先度 | [✓承認] [✏️修正] [✗却下]
- draft行はグレー背景で視覚的に区別
- 修正クリックでインライン編集（内容、担当者、期日、優先度をその場で変更可）
- phase_change タイプの行には「フェーズ更新を承認」ボタン（承認するとガントチャートに反映されるイメージ）

**タブ④: 会議履歴**
- このPJに紐づく会議の一覧（日時、会議名、参加者）
- 各行クリックで議事録の内容を展開表示

### ダミーデータ
以下のダミーデータをフロント内にハードコードして使う:

```typescript
// frontend/src/mock/data.ts

export const mockMembers = [
  { id: "m1", name: "田中太郎", email: "tanaka@novagrid.co.jp" },
  { id: "m2", name: "鈴木花子", email: "suzuki@novagrid.co.jp" },
  { id: "m3", name: "佐藤一郎", email: "sato@novagrid.co.jp" },
  { id: "m4", name: "山田美咲", email: "yamada@novagrid.co.jp" },
];

export const mockProjects = [
  {
    id: "p1",
    name: "会議効率化AI",
    description: "Google Meetの議事録をAIで評価し、レポートをメール配信するシステム",
    status: "active",
    calendar_keywords: ["会議効率化", "meeting-efficiency"],
    start_date: "2025-11-01",
    end_date: "2026-06-30",
    members: [
      { member_id: "m1", role: "PM" },
      { member_id: "m2", role: "Developer" },
    ],
    phases: [
      { id: "ph1", name: "要件定義", sort_order: 1, start_date: "2025-11-01", end_date: "2025-12-15", actual_end_date: "2025-12-20", status: "completed" },
      { id: "ph2", name: "設計", sort_order: 2, start_date: "2025-12-16", end_date: "2026-01-31", actual_end_date: "2026-02-05", status: "completed" },
      { id: "ph3", name: "開発", sort_order: 3, start_date: "2026-02-01", end_date: "2026-04-30", actual_end_date: null, status: "in_progress" },
      { id: "ph4", name: "テスト", sort_order: 4, start_date: "2026-05-01", end_date: "2026-05-31", actual_end_date: null, status: "not_started" },
      { id: "ph5", name: "リリース", sort_order: 5, start_date: "2026-06-01", end_date: "2026-06-30", actual_end_date: null, status: "not_started" },
    ],
    milestones: [
      { id: "ms1", name: "α版リリース", due_date: "2026-03-31", status: "pending", phase_id: "ph3", source: "ai" },
      { id: "ms2", name: "社内テスト開始", due_date: "2026-05-01", status: "pending", phase_id: "ph4", source: "manual" },
    ],
  },
  {
    id: "p2",
    name: "新卒採用2026",
    description: "2026年度新卒採用プロジェクト",
    status: "active",
    calendar_keywords: ["新卒採用", "26新卒"],
    start_date: "2026-01-15",
    end_date: "2026-07-31",
    members: [
      { member_id: "m3", role: "採用責任者" },
      { member_id: "m4", role: "面接官" },
    ],
    phases: [
      { id: "ph6", name: "求人作成", sort_order: 1, start_date: "2026-01-15", end_date: "2026-02-15", actual_end_date: "2026-02-10", status: "completed" },
      { id: "ph7", name: "書類選考", sort_order: 2, start_date: "2026-02-16", end_date: "2026-03-31", actual_end_date: null, status: "in_progress" },
      { id: "ph8", name: "面接", sort_order: 3, start_date: "2026-04-01", end_date: "2026-06-30", actual_end_date: null, status: "not_started" },
      { id: "ph9", name: "オファー", sort_order: 4, start_date: "2026-07-01", end_date: "2026-07-31", actual_end_date: null, status: "not_started" },
    ],
    milestones: [
      { id: "ms3", name: "一次面接開始", due_date: "2026-04-01", status: "pending", phase_id: "ph8", source: "manual" },
    ],
  },
];

export const mockExtractedItems = [
  { id: "e1", meeting_id: "mt1", project_id: "p1", type: "todo", status: "draft", content: "API設計書を作成する", assignee_member_id: "m2", due_date: "2026-03-10", priority: "high", ai_original: { content: "API設計書を作成する", assignee: "鈴木花子", due_date: "2026-03-10", priority: "high" } },
  { id: "e2", meeting_id: "mt1", project_id: "p1", type: "decision", status: "confirmed", content: "認証方式はOAuth2.0を採用する", assignee_member_id: null, due_date: null, priority: "medium", ai_original: { content: "認証方式はOAuth2.0を採用", assignee: null, due_date: null, priority: "medium" } },
  { id: "e3", meeting_id: "mt1", project_id: "p1", type: "issue", status: "draft", content: "Gemini APIのレート制限に引っかかる可能性がある", assignee_member_id: "m1", due_date: null, priority: "high", ai_original: { content: "Gemini APIのレート制限が心配", assignee: "田中太郎", due_date: null, priority: "medium" } },
  { id: "e4", meeting_id: "mt2", project_id: "p1", type: "phase_change", status: "draft", content: "設計フェーズが完了し、開発フェーズに移行", assignee_member_id: null, due_date: null, priority: "medium", ai_original: { content: "設計フェーズ完了、開発着手", phase_completed: "設計", phase_started: "開発", source_quote: "田中：設計レビューも通ったので、来週から開発に入りましょう" } },
  { id: "e5", meeting_id: "mt3", project_id: "p2", type: "todo", status: "draft", content: "エンジニア職の求人原稿を作成する", assignee_member_id: "m3", due_date: "2026-02-28", priority: "medium", ai_original: { content: "エンジニア職の求人原稿を作成", assignee: "佐藤一郎", due_date: "2026-02-28", priority: "medium" } },
];

export const mockMeetings = [
  { id: "mt1", title: "会議効率化AI 定例", date: "2026-02-25", participants: ["田中太郎", "鈴木花子"] },
  { id: "mt2", title: "会議効率化AI 設計レビュー", date: "2026-02-05", participants: ["田中太郎", "鈴木花子", "佐藤一郎"] },
  { id: "mt3", title: "26新卒 採用MTG", date: "2026-02-20", participants: ["佐藤一郎", "山田美咲"] },
];
```

### 完了基準
- 全4画面が遷移可能でダミーデータが表示されている
- ガントチャートにフェーズバー＋マイルストーン＋今日線が描画されている
- 抽出アイテムのフィルタ、承認/修正/却下のUIが動作する（状態はフロント内で完結）
- PJ登録フォームで入力→一覧に反映される（メモリ上のみでOK）
- **完了したら作業を止めて、画面スクリーンショットかURLで確認を取ること**

---

## Step 2〜4 はStep 1のUI確認後に指示する。先にStep 1だけ完了させてください。

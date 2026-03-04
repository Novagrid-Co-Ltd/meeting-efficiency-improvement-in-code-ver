-- 005_scoring_criteria.sql
-- 動的採点軸システム: テーブル作成 + JSONB列追加 + シードデータ

-- ============================================================
-- 1. scoring_criteria — 採点軸マスター
-- ============================================================
CREATE TABLE IF NOT EXISTS scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('meeting', 'individual')),
  key TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  description_ja TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, key)
);

-- ============================================================
-- 2. scoring_criteria_history — 変更履歴
-- ============================================================
CREATE TABLE IF NOT EXISTS scoring_criteria_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_id UUID REFERENCES scoring_criteria(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','updated','deactivated','reactivated')),
  old_values JSONB,
  new_values JSONB,
  changed_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. updated_at トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_scoring_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scoring_criteria_updated_at ON scoring_criteria;
CREATE TRIGGER trg_scoring_criteria_updated_at
  BEFORE UPDATE ON scoring_criteria
  FOR EACH ROW EXECUTE FUNCTION update_scoring_criteria_updated_at();

-- ============================================================
-- 4. 既存テーブルにJSONBカラム追加
-- ============================================================
ALTER TABLE out_meeting_eval
  ADD COLUMN IF NOT EXISTS scores JSONB,
  ADD COLUMN IF NOT EXISTS criteria_snapshot JSONB;

ALTER TABLE out_individual_eval
  ADD COLUMN IF NOT EXISTS scores JSONB,
  ADD COLUMN IF NOT EXISTS criteria_snapshot JSONB;

-- ============================================================
-- 5. バックフィル: 既存レコード → scores JSONB
-- ============================================================
UPDATE out_meeting_eval SET scores = jsonb_build_object(
  'goal_clarity', goal_clarity,
  'decision_made', decision_made,
  'todo_clarity', todo_clarity,
  'role_clarity', role_clarity,
  'time_efficiency', time_efficiency,
  'participation_balance', participation_balance
) WHERE scores IS NULL AND evaluation_status = 'success';

UPDATE out_individual_eval SET scores = jsonb_build_object(
  'issue_comprehension', issue_comprehension,
  'value_density', value_density,
  'structured_thinking', structured_thinking,
  'collaborative_influence', collaborative_influence,
  'decision_drive', decision_drive,
  'execution_linkage', execution_linkage
) WHERE scores IS NULL AND evaluation_status = 'success';

-- ============================================================
-- 6. シードデータ: 現行 会議6軸 + 個人6軸
-- ============================================================
INSERT INTO scoring_criteria (type, key, name_ja, description_ja, weight, sort_order) VALUES
  -- 会議評価軸
  ('meeting', 'goal_clarity', '目的の明確さ',
   '会議の目的・ゴールが事前に明確に設定・共有されていたか。アジェンダが存在し、参加者が何を達成すべきか理解していたか。',
   1.0, 1),
  ('meeting', 'decision_made', '意思決定',
   '議題に対して適切な意思決定がなされたか。決定プロセスは妥当で、合意形成が行われたか。',
   1.0, 2),
  ('meeting', 'todo_clarity', 'TODO明確化',
   '次のアクション（TODO）が具体的に定義され、担当者・期限が明確か。曖昧な「やっておく」で終わっていないか。',
   1.0, 3),
  ('meeting', 'role_clarity', '役割明確さ',
   'ファシリテーター・議事録係など参加者の役割が明確で機能していたか。進行役がいたか。',
   1.0, 4),
  ('meeting', 'time_efficiency', '時間効率',
   '割り当て時間内で効率的に議論が進んだか。脱線・無駄な繰り返し・沈黙がなかったか。',
   1.0, 5),
  ('meeting', 'participation_balance', '発言バランス',
   '参加者全員に発言機会があり、特定の人に偏っていなかったか。',
   1.0, 6),
  -- 個人評価軸
  ('individual', 'issue_comprehension', '課題理解度',
   '議題・課題の本質をどの程度正確に理解し、的確な発言をしていたか。表面的な理解にとどまらず、根本原因や影響範囲まで把握していたか。',
   1.0, 1),
  ('individual', 'value_density', '発言価値密度',
   '発言の質が高く、議論に実質的な価値を提供していたか。情報提供、問題提起、解決策の提案など、発言の中身が充実していたか（量より質）。',
   1.0, 2),
  ('individual', 'structured_thinking', '構造的思考',
   '発言が論理的に整理されており、わかりやすく構造化されていたか。因果関係や優先順位を明確にしながら話していたか。',
   1.0, 3),
  ('individual', 'collaborative_influence', '協調的影響力',
   '他の参加者の意見を活かし、建設的な議論の展開に貢献していたか。対立意見への対応や、チーム全体の議論の質を高める行動があったか。',
   1.0, 4),
  ('individual', 'decision_drive', '意思決定推進',
   '議論を意思決定に向けて推進し、合意形成に貢献していたか。議論が堂々巡りになった際に方向性を示したか。',
   1.0, 5),
  ('individual', 'execution_linkage', '実行連携度',
   '議論を具体的なアクション・タスクに結びつけ、実行可能な提案をしていたか。「次に何をするか」を明確にする発言があったか。',
   1.0, 6)
ON CONFLICT (type, key) DO NOTHING;

-- シードデータの履歴記録
INSERT INTO scoring_criteria_history (criteria_id, action, new_values, changed_by)
SELECT id, 'created', jsonb_build_object(
  'key', key, 'name_ja', name_ja, 'description_ja', description_ja,
  'weight', weight, 'sort_order', sort_order, 'is_active', is_active
), 'migration-005'
FROM scoring_criteria;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_type_active ON scoring_criteria(type, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_history_criteria ON scoring_criteria_history(criteria_id, created_at DESC);

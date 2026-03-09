-- ============================================================
-- 統合スキーマ: 新Supabase用（001+004+005+差分カラム）
-- 旧DBの現在の状態を完全に再現する
-- ============================================================

-- ============================================================
-- 1. ベーステーブル（001相当）
-- ============================================================

CREATE TABLE IF NOT EXISTS master_person_identity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  department text,
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS row_meeting_raw (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meet_instance_key text NOT NULL,
  event_id text NOT NULL,
  eid text NOT NULL,
  document_id text NOT NULL,
  transcript_tab_id text NOT NULL DEFAULT '',
  transcript_title text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  char_count integer NOT NULL DEFAULT 0,
  event_summary text NOT NULL DEFAULT '',
  event_start timestamptz,
  event_end timestamptz,
  event_organizer_email text NOT NULL DEFAULT '',
  event_html_link text NOT NULL DEFAULT '',
  attendee_count integer NOT NULL DEFAULT 0,
  -- 差分カラム（マイグレーションファイルに未記載だが旧DBに存在）
  project_name text,
  summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key)
);

CREATE TABLE IF NOT EXISTS tf_meeting_attendee (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meet_instance_key text NOT NULL REFERENCES row_meeting_raw(meet_instance_key),
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  response_status text NOT NULL DEFAULT '',
  is_organizer boolean NOT NULL DEFAULT false,
  person_id uuid REFERENCES master_person_identity(id),
  resolve_method text NOT NULL DEFAULT 'unresolved',
  confidence real NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key, email)
);

CREATE TABLE IF NOT EXISTS tf_individual_score_input (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meet_instance_key text NOT NULL REFERENCES row_meeting_raw(meet_instance_key),
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  event_summary text NOT NULL DEFAULT '',
  event_start timestamptz,
  event_end timestamptz,
  attendee_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key, email)
);

CREATE TABLE IF NOT EXISTS out_meeting_eval (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meet_instance_key text NOT NULL REFERENCES row_meeting_raw(meet_instance_key),
  evaluation_status text NOT NULL DEFAULT 'pending',
  prompt_version text NOT NULL DEFAULT '',
  goal_clarity real,
  decision_made real,
  todo_clarity real,
  role_clarity real,
  time_efficiency real,
  participation_balance real,
  headline text,
  overall_assessment text,
  strength_axis text,
  strength_reason text,
  weakness_axis text,
  weakness_reason text,
  key_topics jsonb,
  special_notes jsonb,
  decisions jsonb,
  action_items jsonb,
  recommendations jsonb,
  participation_note text,
  raw_response text,
  -- 005相当: 動的採点軸
  scores jsonb,
  criteria_snapshot jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key)
);

CREATE TABLE IF NOT EXISTS out_individual_eval (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meet_instance_key text NOT NULL REFERENCES row_meeting_raw(meet_instance_key),
  email text NOT NULL,
  evaluation_status text NOT NULL DEFAULT 'pending',
  prompt_version text NOT NULL DEFAULT '',
  issue_comprehension real,
  value_density real,
  structured_thinking real,
  collaborative_influence real,
  decision_drive real,
  execution_linkage real,
  evidence_quotes jsonb,
  evidence_notes jsonb,
  strengths jsonb,
  improvements jsonb,
  communication_style text,
  summary text,
  raw_response text,
  -- 005相当: 動的採点軸
  scores jsonb,
  criteria_snapshot jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key, email)
);

-- ============================================================
-- 2. PJ Hub v2（004相当）
-- ============================================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_hold', 'completed', 'archived')),
  calendar_keywords JSONB DEFAULT '[]',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES master_person_identity(id),
  role TEXT DEFAULT '',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, member_id)
);

CREATE TABLE IF NOT EXISTS phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  actual_end_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  created_by TEXT DEFAULT 'manual'
    CHECK (created_by IN ('manual', 'ai')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'achieved')),
  achieved_date DATE,
  source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai')),
  source_meeting_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL,
  matched_by TEXT DEFAULT 'manual'
    CHECK (matched_by IN ('manual', 'ai')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, meeting_id)
);

CREATE TABLE IF NOT EXISTS extracted_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  type TEXT NOT NULL
    CHECK (type IN ('todo', 'decision', 'issue', 'phase_change')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'rejected')),
  ai_original JSONB NOT NULL,
  content TEXT NOT NULL,
  assignee_member_id UUID REFERENCES master_person_identity(id) ON DELETE SET NULL,
  due_date DATE,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  -- 差分カラム（マイグレーションファイルに未記載だが旧DBに存在）
  milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 採点軸マスター（005相当）
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
-- 4. インデックス
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_member ON project_members(member_id);
CREATE INDEX IF NOT EXISTS idx_phases_project ON phases(project_id);
CREATE INDEX IF NOT EXISTS idx_phases_status ON phases(status);
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_phase ON milestones(phase_id);
CREATE INDEX IF NOT EXISTS idx_project_meetings_project ON project_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_meetings_meeting ON project_meetings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_extracted_items_project ON extracted_items(project_id);
CREATE INDEX IF NOT EXISTS idx_extracted_items_meeting ON extracted_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_extracted_items_status ON extracted_items(status);
CREATE INDEX IF NOT EXISTS idx_extracted_items_type ON extracted_items(type);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_type_active ON scoring_criteria(type, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_scoring_criteria_history_criteria ON scoring_criteria_history(criteria_id, created_at DESC);

-- ============================================================
-- 5. トリガー: updated_at 自動更新
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER phases_updated_at
  BEFORE UPDATE ON phases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER extracted_items_updated_at
  BEFORE UPDATE ON extracted_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_scoring_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_scoring_criteria_updated_at
  BEFORE UPDATE ON scoring_criteria
  FOR EACH ROW EXECUTE FUNCTION update_scoring_criteria_updated_at();

-- ============================================================
-- 6. シードデータ: 採点軸
-- ============================================================

INSERT INTO scoring_criteria (type, key, name_ja, description_ja, weight, sort_order) VALUES
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

INSERT INTO scoring_criteria_history (criteria_id, action, new_values, changed_by)
SELECT id, 'created', jsonb_build_object(
  'key', key, 'name_ja', name_ja, 'description_ja', description_ja,
  'weight', weight, 'sort_order', sort_order, 'is_active', is_active
), 'migration-005'
FROM scoring_criteria;

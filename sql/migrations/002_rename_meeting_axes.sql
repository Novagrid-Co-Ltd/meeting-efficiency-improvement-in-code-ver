-- 会議評価の6軸名変更 + コンテンツ構造変更
-- agenda_structure → role_clarity
-- decision_quality → decision_made
-- action_item_clarity → todo_clarity
-- what_went_well / what_to_improve → strength/weakness + special_notes

ALTER TABLE out_meeting_eval RENAME COLUMN agenda_structure TO role_clarity;
ALTER TABLE out_meeting_eval RENAME COLUMN decision_quality TO decision_made;
ALTER TABLE out_meeting_eval RENAME COLUMN action_item_clarity TO todo_clarity;

-- 旧カラム削除
ALTER TABLE out_meeting_eval DROP COLUMN IF EXISTS what_went_well;
ALTER TABLE out_meeting_eval DROP COLUMN IF EXISTS what_to_improve;

-- 新カラム追加 (out_meeting_eval)
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS key_topics jsonb;
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS strength_axis text;
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS strength_reason text;
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS weakness_axis text;
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS weakness_reason text;
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS special_notes jsonb;
ALTER TABLE out_meeting_eval ADD COLUMN IF NOT EXISTS recommendations jsonb;

-- 新カラム追加 (out_individual_eval)
ALTER TABLE out_individual_eval ADD COLUMN IF NOT EXISTS strengths jsonb;
ALTER TABLE out_individual_eval ADD COLUMN IF NOT EXISTS improvements jsonb;
ALTER TABLE out_individual_eval ADD COLUMN IF NOT EXISTS communication_style text;

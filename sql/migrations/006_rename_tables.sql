-- ============================================================
-- 006: テーブルリネーム（プレフィックス追加）
-- mst_ = 共通マスタ, eval_ = 会議評価, pjhub_ = PJ Hub
-- ============================================================

-- 共通マスタ
ALTER TABLE master_person_identity RENAME TO mst_person_identity;

-- 会議評価
ALTER TABLE row_meeting_raw RENAME TO eval_meeting_raw;
ALTER TABLE tf_meeting_attendee RENAME TO eval_meeting_attendee;
ALTER TABLE tf_individual_score_input RENAME TO eval_individual_input;
ALTER TABLE out_meeting_eval RENAME TO eval_meeting_score;
ALTER TABLE out_individual_eval RENAME TO eval_individual_score;
ALTER TABLE scoring_criteria RENAME TO eval_scoring_criteria;
ALTER TABLE scoring_criteria_history RENAME TO eval_scoring_criteria_history;

-- PJ Hub
ALTER TABLE projects RENAME TO pjhub_projects;
ALTER TABLE project_members RENAME TO pjhub_project_members;
ALTER TABLE phases RENAME TO pjhub_phases;
ALTER TABLE milestones RENAME TO pjhub_milestones;
ALTER TABLE project_meetings RENAME TO pjhub_project_meetings;
ALTER TABLE extracted_items RENAME TO pjhub_extracted_items;

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'on_hold', 'archived')),
  members JSONB DEFAULT '[]',
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
    CHECK (type IN ('todo', 'decision', 'issue')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'rejected')),
  ai_original JSONB NOT NULL,
  content TEXT NOT NULL,
  assignee TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('high', 'medium', 'low')),
  confirmed_at TIMESTAMPTZ,
  confirmed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extracted_items_project ON extracted_items(project_id);
CREATE INDEX IF NOT EXISTS idx_extracted_items_meeting ON extracted_items(meeting_id);
CREATE INDEX IF NOT EXISTS idx_extracted_items_status ON extracted_items(status);
CREATE INDEX IF NOT EXISTS idx_project_meetings_project ON project_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_meetings_meeting ON project_meetings(meeting_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER extracted_items_updated_at
  BEFORE UPDATE ON extracted_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

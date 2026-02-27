-- master_person_identity
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

-- row_meeting_raw
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key)
);

-- tf_meeting_attendee
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

-- tf_individual_score_input
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

-- out_meeting_eval
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
  special_notes jsonb,
  decisions jsonb,
  action_items jsonb,
  participation_note text,
  raw_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key)
);

-- out_individual_eval
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
  summary text,
  raw_response text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (meet_instance_key, email)
);

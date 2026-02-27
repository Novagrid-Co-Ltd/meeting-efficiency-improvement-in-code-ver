export interface GeminiMeetingResponse {
  summary_scores: {
    goal_clarity: number;
    agenda_structure: number;
    time_efficiency: number;
    participation_balance: number;
    decision_quality: number;
    action_item_clarity: number;
  };
  human_summary: {
    headline: string;
    overall_assessment: string;
    what_went_well: string[];
    what_to_improve: string[];
    decisions: string[];
    action_items: string[];
    participation_note: string;
  };
}

export interface GeminiIndividualResponse {
  scores: {
    issue_comprehension: number;
    value_density: number;
    structured_thinking: number;
    collaborative_influence: number;
    decision_drive: number;
    execution_linkage: number;
  };
  evidence: {
    quotes: string[];
    notes: string[];
  };
  summary: string;
}

export interface OutMeetingEval {
  id?: string;
  meet_instance_key: string;
  evaluation_status: "success" | "failed";
  prompt_version: string;
  goal_clarity: number | null;
  agenda_structure: number | null;
  time_efficiency: number | null;
  participation_balance: number | null;
  decision_quality: number | null;
  action_item_clarity: number | null;
  headline: string | null;
  overall_assessment: string | null;
  what_went_well: string[] | null;
  what_to_improve: string[] | null;
  decisions: string[] | null;
  action_items: string[] | null;
  participation_note: string | null;
  raw_response: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OutIndividualEval {
  id?: string;
  meet_instance_key: string;
  email: string;
  evaluation_status: "success" | "failed";
  prompt_version: string;
  issue_comprehension: number | null;
  value_density: number | null;
  structured_thinking: number | null;
  collaborative_influence: number | null;
  decision_drive: number | null;
  execution_linkage: number | null;
  evidence_quotes: string[] | null;
  evidence_notes: string[] | null;
  summary: string | null;
  raw_response: string | null;
  created_at?: string;
  updated_at?: string;
}

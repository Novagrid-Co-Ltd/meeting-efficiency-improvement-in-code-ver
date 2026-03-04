const API_KEY = "Mancity.94";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
      ...(options?.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `API error: ${res.status}`);
  }
  const json = await res.json();
  if (json.ok === false) throw new Error(json.error?.message ?? "Unknown error");
  return json;
}

// --- Projects ---

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  status: "active" | "on_hold" | "completed" | "archived";
  calendar_keywords: string[];
  start_date: string | null;
  end_date: string | null;
  draft_item_count: number;
  current_phase: string | null;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: "active" | "on_hold" | "completed" | "archived";
  calendar_keywords: string[];
  start_date: string | null;
  end_date: string | null;
  members: ProjectMemberRow[];
  phases: PhaseRow[];
  milestones: MilestoneRow[];
  meetings: ProjectMeetingRow[];
}

export interface ProjectMemberRow {
  id: string;
  member_id: string;
  role: string;
  master_person_identity: { id: string; display_name: string; email: string } | { id: string; display_name: string; email: string }[] | null;
}

export interface PhaseRow {
  id: string;
  name: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  actual_end_date: string | null;
  status: "not_started" | "in_progress" | "completed";
}

export interface MilestoneRow {
  id: string;
  name: string;
  due_date: string | null;
  status: "pending" | "achieved";
  phase_id: string | null;
  source: "manual" | "ai";
}

export interface ProjectMeetingRow {
  id: string;
  project_id: string;
  meeting_id: string;
  matched_by: "manual" | "ai";
  row_meeting_raw: {
    id: string;
    event_summary: string;
    event_start: string;
    event_end: string;
    attendee_count: number;
    transcript?: string;
  } | null;
}

export async function getProjects(): Promise<ProjectListItem[]> {
  const res = await request<{ data: ProjectListItem[] }>("/api/projects");
  return res.data;
}

export async function getProject(id: string): Promise<ProjectDetail> {
  const res = await request<{ data: ProjectDetail }>(`/api/projects/${id}`);
  return res.data;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  calendar_keywords?: string[];
  start_date?: string | null;
  end_date?: string | null;
  members?: { member_id: string; role: string }[];
  phases?: { name: string; sort_order: number; start_date?: string | null; end_date?: string | null }[];
}

export async function createProject(data: CreateProjectPayload) {
  return request<{ data: unknown }>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: Record<string, unknown>) {
  return request<{ data: unknown }>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// --- Members ---

export interface MemberRow {
  id: string;
  display_name: string;
  email: string;
  department: string | null;
  role: string | null;
}

export async function getMembers(): Promise<MemberRow[]> {
  const res = await request<{ data: MemberRow[] }>("/api/members");
  return res.data;
}

// --- Extracted Items ---

export interface ExtractedItemRow {
  id: string;
  meeting_id: string;
  project_id: string | null;
  type: "todo" | "decision" | "issue" | "phase_change";
  status: "draft" | "confirmed" | "rejected";
  content: string;
  assignee_member_id: string | null;
  due_date: string | null;
  priority: "high" | "medium" | "low";
  ai_original: {
    content: string;
    assignee?: string | null;
    due_date?: string | null;
    priority?: string;
    source_quote?: string;
    phase_completed?: string;
    phase_started?: string;
  };
}

export async function getExtractedItems(params?: { project_id?: string; status?: string; type?: string }): Promise<ExtractedItemRow[]> {
  const sp = new URLSearchParams();
  if (params?.project_id) sp.set("project_id", params.project_id);
  if (params?.status) sp.set("status", params.status);
  if (params?.type) sp.set("type", params.type);
  const qs = sp.toString();
  const res = await request<{ data: ExtractedItemRow[] }>(`/api/extracted-items${qs ? `?${qs}` : ""}`);
  return res.data;
}

export async function updateItem(id: string, data: { content?: string; assignee_member_id?: string | null; due_date?: string | null; priority?: string }) {
  return request<{ data: ExtractedItemRow }>(`/api/extracted-items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function confirmItem(id: string) {
  return request<{ data: ExtractedItemRow }>(`/api/extracted-items/${id}/confirm`, { method: "PATCH" });
}

export async function rejectItem(id: string) {
  return request<{ data: ExtractedItemRow }>(`/api/extracted-items/${id}/reject`, { method: "PATCH" });
}

// --- Scoring Criteria ---

export interface ScoringCriteriaRow {
  id: string;
  type: "meeting" | "individual";
  key: string;
  name_ja: string;
  description_ja: string;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ScoringCriteriaHistoryRow {
  id: string;
  criteria_id: string;
  action: "created" | "updated" | "deactivated" | "reactivated";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: string;
  created_at: string;
}

export async function getCriteria(params?: { type?: string; active?: boolean }): Promise<ScoringCriteriaRow[]> {
  const sp = new URLSearchParams();
  if (params?.type) sp.set("type", params.type);
  if (params?.active) sp.set("active", "true");
  const qs = sp.toString();
  const res = await request<{ data: ScoringCriteriaRow[] }>(`/api/scoring-criteria${qs ? `?${qs}` : ""}`);
  return res.data;
}

export async function getCriteriaById(id: string): Promise<ScoringCriteriaRow> {
  const res = await request<{ data: ScoringCriteriaRow }>(`/api/scoring-criteria/${id}`);
  return res.data;
}

export async function createCriteria(data: {
  type: string;
  key: string;
  name_ja: string;
  description_ja: string;
  weight?: number;
  sort_order?: number;
}): Promise<ScoringCriteriaRow> {
  const res = await request<{ data: ScoringCriteriaRow }>("/api/scoring-criteria", {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function updateCriteria(
  id: string,
  data: { name_ja?: string; description_ja?: string; weight?: number; sort_order?: number; is_active?: boolean },
): Promise<ScoringCriteriaRow> {
  const res = await request<{ data: ScoringCriteriaRow }>(`/api/scoring-criteria/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  return res.data;
}

export async function getCriteriaHistory(id: string): Promise<ScoringCriteriaHistoryRow[]> {
  const res = await request<{ data: ScoringCriteriaHistoryRow[] }>(`/api/scoring-criteria/${id}/history`);
  return res.data;
}

export async function previewPrompt(type: string): Promise<{ type: string; criteriaCount: number; prompt: string }> {
  const res = await request<{ data: { type: string; criteriaCount: number; prompt: string } }>(
    "/api/scoring-criteria/preview-prompt",
    { method: "POST", body: JSON.stringify({ type }) },
  );
  return res.data;
}

// --- Admin actions ---

export async function triggerExtraction(meetingId: string) {
  return request<{ ok: boolean; itemCount: number; milestoneCount: number; projectIds: string[] }>(`/api/extract/${meetingId}`, { method: "POST" });
}

export async function triggerBatchExtraction() {
  return request<{ ok: boolean; summary: { total: number; succeeded: number; skipped: number; failed: number } }>("/api/extract/batch", { method: "POST" });
}

export async function triggerMatchMeetings() {
  return request<{ ok: boolean; summary: { totalProcessed: number; matched: number; unmatched: number } }>("/api/projects/match-meetings", { method: "POST" });
}

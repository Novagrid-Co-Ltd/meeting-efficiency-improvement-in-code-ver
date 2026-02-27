import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getConfig } from "../config.js";
import type { RowMeetingRaw, TfMeetingAttendee, TfIndividualScoreInput, MasterPersonIdentity } from "../types/meeting.js";
import type { OutMeetingEval, OutIndividualEval } from "../types/evaluation.js";
import { logger } from "../utils/logger.js";

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const cfg = getConfig();
    _supabase = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey);
  }
  return _supabase;
}

// --- row_meeting_raw ---

export async function upsertRowData(row: RowMeetingRaw): Promise<RowMeetingRaw> {
  const { data, error } = await getSupabase()
    .from("row_meeting_raw")
    .upsert(row, { onConflict: "meet_instance_key" })
    .select()
    .single();
  if (error) throw error;
  logger.info("Upserted row_meeting_raw", { meet_instance_key: row.meet_instance_key });
  return data as RowMeetingRaw;
}

// --- tf_meeting_attendee ---

export async function upsertAttendees(meetInstanceKey: string, attendees: TfMeetingAttendee[]): Promise<void> {
  const rows = attendees.map((a) => ({ ...a, meet_instance_key: meetInstanceKey }));
  const { error } = await getSupabase()
    .from("tf_meeting_attendee")
    .upsert(rows, { onConflict: "meet_instance_key,email" });
  if (error) throw error;
  logger.info("Upserted tf_meeting_attendee", { meetInstanceKey, count: attendees.length });
}

// --- tf_individual_score_input ---

export async function upsertIndividualInputs(inputs: TfIndividualScoreInput[]): Promise<void> {
  const { error } = await getSupabase()
    .from("tf_individual_score_input")
    .upsert(inputs, { onConflict: "meet_instance_key,email" });
  if (error) throw error;
  logger.info("Upserted tf_individual_score_input", { count: inputs.length });
}

// --- out_meeting_eval ---

export async function upsertMeetingEval(evalData: OutMeetingEval): Promise<void> {
  const { error } = await getSupabase()
    .from("out_meeting_eval")
    .upsert(evalData, { onConflict: "meet_instance_key" });
  if (error) throw error;
  logger.info("Upserted out_meeting_eval", { meet_instance_key: evalData.meet_instance_key });
}

// --- out_individual_eval ---

export async function upsertIndividualEval(evalData: OutIndividualEval): Promise<void> {
  const { error } = await getSupabase()
    .from("out_individual_eval")
    .upsert(evalData, { onConflict: "meet_instance_key,email" });
  if (error) throw error;
  logger.info("Upserted out_individual_eval", { meet_instance_key: evalData.meet_instance_key, email: evalData.email });
}

// --- master_person_identity ---

export async function getPersonIdentities(): Promise<MasterPersonIdentity[]> {
  const { data, error } = await getSupabase()
    .from("master_person_identity")
    .select("*");
  if (error) throw error;
  return (data ?? []) as MasterPersonIdentity[];
}

// --- debug: fetch meeting by key ---

export async function getMeetingByKey(meetInstanceKey: string) {
  const [row, attendees, meetingEval, individualEvals] = await Promise.all([
    getSupabase().from("row_meeting_raw").select("*").eq("meet_instance_key", meetInstanceKey).single(),
    getSupabase().from("tf_meeting_attendee").select("*").eq("meet_instance_key", meetInstanceKey),
    getSupabase().from("out_meeting_eval").select("*").eq("meet_instance_key", meetInstanceKey).single(),
    getSupabase().from("out_individual_eval").select("*").eq("meet_instance_key", meetInstanceKey),
  ]);
  return {
    row: row.data,
    attendees: attendees.data,
    meetingEval: meetingEval.data,
    individualEvals: individualEvals.data,
  };
}

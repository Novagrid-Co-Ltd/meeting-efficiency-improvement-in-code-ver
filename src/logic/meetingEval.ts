import type { RowMeetingRaw } from "../types/meeting.js";
import type { OutMeetingEval, GeminiMeetingResponse } from "../types/evaluation.js";
import { generateAndParse } from "../services/gemini.js";
import { upsertMeetingEval } from "../services/supabase.js";
import { buildMeetingEvalPrompt, PROMPT_VERSION } from "../prompts/meetingEval.js";
import { logger } from "../utils/logger.js";

export async function run(rowData: RowMeetingRaw): Promise<OutMeetingEval> {
  const prompt = buildMeetingEvalPrompt({
    eventSummary: rowData.event_summary,
    eventStart: rowData.event_start,
    eventEnd: rowData.event_end,
    attendeeCount: rowData.attendee_count,
    charCount: rowData.char_count,
    transcript: rowData.transcript,
  });

  const { parsed, raw } = await generateAndParse<GeminiMeetingResponse>(prompt);

  let evalData: OutMeetingEval;

  if (parsed) {
    evalData = {
      meet_instance_key: rowData.meet_instance_key,
      evaluation_status: "success",
      prompt_version: PROMPT_VERSION,
      goal_clarity: parsed.summary_scores.goal_clarity,
      agenda_structure: parsed.summary_scores.agenda_structure,
      time_efficiency: parsed.summary_scores.time_efficiency,
      participation_balance: parsed.summary_scores.participation_balance,
      decision_quality: parsed.summary_scores.decision_quality,
      action_item_clarity: parsed.summary_scores.action_item_clarity,
      headline: parsed.human_summary.headline,
      overall_assessment: parsed.human_summary.overall_assessment,
      what_went_well: parsed.human_summary.what_went_well,
      what_to_improve: parsed.human_summary.what_to_improve,
      decisions: parsed.human_summary.decisions,
      action_items: parsed.human_summary.action_items,
      participation_note: parsed.human_summary.participation_note,
      raw_response: raw,
    };
  } else {
    logger.error("Meeting evaluation failed: could not parse Gemini response", {
      meet_instance_key: rowData.meet_instance_key,
    });
    evalData = {
      meet_instance_key: rowData.meet_instance_key,
      evaluation_status: "failed",
      prompt_version: PROMPT_VERSION,
      goal_clarity: null,
      agenda_structure: null,
      time_efficiency: null,
      participation_balance: null,
      decision_quality: null,
      action_item_clarity: null,
      headline: null,
      overall_assessment: null,
      what_went_well: null,
      what_to_improve: null,
      decisions: null,
      action_items: null,
      participation_note: null,
      raw_response: raw,
    };
  }

  await upsertMeetingEval(evalData);
  return evalData;
}

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
      decision_made: parsed.summary_scores.decision_made,
      todo_clarity: parsed.summary_scores.todo_clarity,
      role_clarity: parsed.summary_scores.role_clarity,
      time_efficiency: parsed.summary_scores.time_efficiency,
      participation_balance: parsed.summary_scores.participation_balance,
      headline: parsed.human_summary.headline,
      overall_assessment: parsed.human_summary.overall_assessment,
      key_topics: parsed.human_summary.key_topics,
      strength_axis: parsed.human_summary.strength_axis,
      strength_reason: parsed.human_summary.strength_reason,
      weakness_axis: parsed.human_summary.weakness_axis,
      weakness_reason: parsed.human_summary.weakness_reason,
      special_notes: parsed.human_summary.special_notes,
      decisions: parsed.human_summary.decisions,
      action_items: parsed.human_summary.action_items,
      recommendations: parsed.human_summary.recommendations,
      participation_note: parsed.human_summary.participation_note,
      raw_response: raw,
    };
  } else {
    logger.error("Meeting evaluation failed: could not parse LLM response", {
      meet_instance_key: rowData.meet_instance_key,
    });
    evalData = {
      meet_instance_key: rowData.meet_instance_key,
      evaluation_status: "failed",
      prompt_version: PROMPT_VERSION,
      goal_clarity: null,
      decision_made: null,
      todo_clarity: null,
      role_clarity: null,
      time_efficiency: null,
      participation_balance: null,
      headline: null,
      overall_assessment: null,
      key_topics: null,
      strength_axis: null,
      strength_reason: null,
      weakness_axis: null,
      weakness_reason: null,
      special_notes: null,
      decisions: null,
      action_items: null,
      recommendations: null,
      participation_note: null,
      raw_response: raw,
    };
  }

  await upsertMeetingEval(evalData);
  return evalData;
}

import type { TfIndividualScoreInput } from "../types/meeting.js";
import type { OutIndividualEval, GeminiIndividualResponse } from "../types/evaluation.js";
import { generateAndParse } from "../services/gemini.js";
import { upsertIndividualEval } from "../services/supabase.js";
import { buildIndividualEvalPrompt, PROMPT_VERSION } from "../prompts/individualEval.js";
import { logger } from "../utils/logger.js";

async function runOne(input: TfIndividualScoreInput): Promise<OutIndividualEval> {
  const prompt = buildIndividualEvalPrompt({
    displayName: input.display_name,
    email: input.email,
    eventSummary: input.event_summary,
    eventStart: input.event_start,
    eventEnd: input.event_end,
    attendeeCount: input.attendee_count,
    transcript: input.transcript,
  });

  const { parsed, raw } = await generateAndParse<GeminiIndividualResponse>(prompt);

  let evalData: OutIndividualEval;

  if (parsed) {
    evalData = {
      meet_instance_key: input.meet_instance_key,
      email: input.email,
      evaluation_status: "success",
      prompt_version: PROMPT_VERSION,
      issue_comprehension: parsed.scores.issue_comprehension,
      value_density: parsed.scores.value_density,
      structured_thinking: parsed.scores.structured_thinking,
      collaborative_influence: parsed.scores.collaborative_influence,
      decision_drive: parsed.scores.decision_drive,
      execution_linkage: parsed.scores.execution_linkage,
      evidence_quotes: parsed.evidence.quotes,
      evidence_notes: parsed.evidence.notes,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      communication_style: parsed.communication_style,
      summary: parsed.summary,
      raw_response: raw,
    };
  } else {
    logger.error("Individual evaluation failed", {
      meet_instance_key: input.meet_instance_key,
      email: input.email,
    });
    evalData = {
      meet_instance_key: input.meet_instance_key,
      email: input.email,
      evaluation_status: "failed",
      prompt_version: PROMPT_VERSION,
      issue_comprehension: null,
      value_density: null,
      structured_thinking: null,
      collaborative_influence: null,
      decision_drive: null,
      execution_linkage: null,
      evidence_quotes: null,
      evidence_notes: null,
      strengths: null,
      improvements: null,
      communication_style: null,
      summary: null,
      raw_response: raw,
    };
  }

  await upsertIndividualEval(evalData);
  return evalData;
}

export async function runAll(inputs: TfIndividualScoreInput[]): Promise<OutIndividualEval[]> {
  const results: OutIndividualEval[] = [];

  // Sequential execution — do not parallelize
  for (const input of inputs) {
    try {
      const result = await runOne(input);
      results.push(result);
    } catch (err) {
      logger.error("Individual eval error, continuing to next participant", {
        email: input.email,
        error: err instanceof Error ? err.message : String(err),
      });
      results.push({
        meet_instance_key: input.meet_instance_key,
        email: input.email,
        evaluation_status: "failed",
        prompt_version: PROMPT_VERSION,
        issue_comprehension: null,
        value_density: null,
        structured_thinking: null,
        collaborative_influence: null,
        decision_drive: null,
        execution_linkage: null,
        evidence_quotes: null,
        evidence_notes: null,
        strengths: null,
        improvements: null,
        communication_style: null,
        summary: null,
        raw_response: null,
      });
    }
  }

  return results;
}

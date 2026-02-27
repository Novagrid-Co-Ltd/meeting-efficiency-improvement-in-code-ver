// TODO: Migrate actual prompt from n8n "Message a model2" node
export const PROMPT_VERSION = "meeting-eval-v0.1.0-placeholder";

interface MeetingEvalPromptInput {
  eventSummary: string;
  eventStart: string;
  eventEnd: string;
  attendeeCount: number;
  charCount: number;
  transcript: string;
}

export function buildMeetingEvalPrompt(input: MeetingEvalPromptInput): string {
  return `You are a meeting evaluation expert. Analyze the following meeting transcript and provide a structured evaluation.

## Meeting Metadata
- Title: ${input.eventSummary}
- Start: ${input.eventStart}
- End: ${input.eventEnd}
- Number of Attendees: ${input.attendeeCount}
- Transcript Length: ${input.charCount} characters

## Evaluation Criteria
Rate each dimension on a scale of 1-5 (1=very poor, 5=excellent):

1. **goal_clarity** — Was the meeting purpose clear and communicated?
2. **agenda_structure** — Was there a logical structure/agenda followed?
3. **time_efficiency** — Was time used effectively without unnecessary tangents?
4. **participation_balance** — Did multiple attendees contribute meaningfully?
5. **decision_quality** — Were decisions made clearly and with appropriate reasoning?
6. **action_item_clarity** — Were next steps and owners clearly defined?

## Required Output Format
Respond ONLY with valid JSON in the following format:
{
  "summary_scores": {
    "goal_clarity": <1-5>,
    "agenda_structure": <1-5>,
    "time_efficiency": <1-5>,
    "participation_balance": <1-5>,
    "decision_quality": <1-5>,
    "action_item_clarity": <1-5>
  },
  "human_summary": {
    "headline": "<one-line summary of the meeting>",
    "overall_assessment": "<2-3 sentence overall assessment>",
    "what_went_well": ["<point1>", "<point2>"],
    "what_to_improve": ["<point1>", "<point2>"],
    "decisions": ["<decision1>", "<decision2>"],
    "action_items": ["<action item with owner>"],
    "participation_note": "<note about participation balance>"
  }
}

## Transcript
${input.transcript}`;
}

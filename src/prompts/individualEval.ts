// TODO: Migrate actual prompt from n8n "Message a model1" node
export const PROMPT_VERSION = "individual-eval-v0.1.0-placeholder";

interface IndividualEvalPromptInput {
  displayName: string;
  email: string;
  eventSummary: string;
  eventStart: string;
  eventEnd: string;
  attendeeCount: number;
  transcript: string;
}

export function buildIndividualEvalPrompt(input: IndividualEvalPromptInput): string {
  return `You are a meeting participation evaluator. Analyze the following meeting transcript and evaluate the individual contribution of a specific participant.

## Meeting Metadata
- Title: ${input.eventSummary}
- Start: ${input.eventStart}
- End: ${input.eventEnd}
- Number of Attendees: ${input.attendeeCount}

## Target Participant
- Name: ${input.displayName}
- Email: ${input.email}

## Evaluation Criteria
Rate each dimension on a scale of 1-5 (1=very poor, 5=excellent):

1. **issue_comprehension** — How well does this person understand the topics discussed?
2. **value_density** — How much value does each of their contributions add?
3. **structured_thinking** — Are their ideas organized and logically presented?
4. **collaborative_influence** — Do they positively influence the group dynamic and build on others' ideas?
5. **decision_drive** — Do they help move discussions toward decisions?
6. **execution_linkage** — Do they connect discussions to concrete next steps and actions?

## Required Output Format
Respond ONLY with valid JSON in the following format:
{
  "scores": {
    "issue_comprehension": <1-5>,
    "value_density": <1-5>,
    "structured_thinking": <1-5>,
    "collaborative_influence": <1-5>,
    "decision_drive": <1-5>,
    "execution_linkage": <1-5>
  },
  "evidence": {
    "quotes": ["<direct quote from transcript>", "<another quote>"],
    "notes": ["<observation about their participation>"]
  },
  "summary": "<2-3 sentence summary of this person's contribution>"
}

## Transcript
${input.transcript}`;
}

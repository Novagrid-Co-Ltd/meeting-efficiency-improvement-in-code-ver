export const PROMPT_VERSION = "meeting-eval-v1.0.0";

interface MeetingEvalPromptInput {
  eventSummary: string;
  eventStart: string;
  eventEnd: string;
  attendeeCount: number;
  charCount: number;
  transcript: string;
}

export function buildMeetingEvalPrompt(input: MeetingEvalPromptInput): string {
  return `あなたは会議効率化の専門家です。以下の会議の文字起こしを分析し、構造化された評価を提供してください。

## 会議メタデータ
- 会議名: ${input.eventSummary}
- 開始: ${input.eventStart}
- 終了: ${input.eventEnd}
- 参加者数: ${input.attendeeCount}名
- 文字数: ${input.charCount}文字

## 評価基準
各項目を1〜5点で評価してください（1=非常に悪い、5=非常に良い）:

1. **goal_clarity**（目的の明確さ）— 会議の目的・ゴールが事前に明確に設定・共有されていたか
2. **decision_made**（意思決定）— 議題に対して適切な意思決定がなされたか、決定プロセスは妥当だったか
3. **todo_clarity**（TODO明確化）— 次のアクション（TODO）が具体的に定義され、担当者・期限が明確か
4. **role_clarity**（役割明確さ）— ファシリテーター・議事録係など参加者の役割が明確で機能していたか
5. **time_efficiency**（時間効率）— 割り当て時間内で効率的に議論が進んだか、脱線や無駄がなかったか
6. **participation_balance**（発言バランス）— 参加者全員に発言機会があり、特定の人に偏っていなかったか

## 出力フォーマット
以下のJSON形式のみで回答してください。JSON以外のテキストは含めないでください。
{
  "summary_scores": {
    "goal_clarity": <1-5>,
    "decision_made": <1-5>,
    "todo_clarity": <1-5>,
    "role_clarity": <1-5>,
    "time_efficiency": <1-5>,
    "participation_balance": <1-5>
  },
  "human_summary": {
    "headline": "<会議を一言で表すAI分析ヘッドライン（30文字以内）>",
    "overall_assessment": "<2〜3文の全体傾向分析。スコアの根拠を含めて記述>",
    "strength_axis": "<6軸の中で最も高いスコアの軸名（英語キー名）>",
    "strength_reason": "<その軸が高い理由を1〜2文で>",
    "weakness_axis": "<6軸の中で最も低いスコアの軸名（英語キー名）>",
    "weakness_reason": "<その軸が低い理由を1〜2文で>",
    "special_notes": ["<特筆すべき観察事項1>", "<特筆すべき観察事項2>"],
    "decisions": ["<決定事項1>", "<決定事項2>"],
    "action_items": ["[high] <具体的なアクション（担当者: 対象者名）>", "[medium] <アクション>"],
    "participation_note": "<発言バランスに関する具体的な分析>"
  }
}

## 注意事項
- スコアは必ず1〜5の整数で回答してください
- headline は30文字以内の日本語で
- action_items の各項目は先頭に [high], [medium], [low] のいずれかの優先度をつけてください
- strength_axis, weakness_axis は英語のキー名（goal_clarity, decision_made, todo_clarity, role_clarity, time_efficiency, participation_balance）で回答してください
- 日本語で回答してください（キー名を除く）

## 文字起こし
${input.transcript}`;
}

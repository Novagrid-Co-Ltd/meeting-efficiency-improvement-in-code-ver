export const PROMPT_VERSION = "individual-eval-v1.0.0";

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
  return `あなたは会議における個人の貢献度を評価する専門家です。以下の会議の文字起こしを分析し、指定された参加者の貢献を評価してください。

## 会議メタデータ
- 会議名: ${input.eventSummary}
- 開始: ${input.eventStart}
- 終了: ${input.eventEnd}
- 参加者数: ${input.attendeeCount}名

## 評価対象者
- 氏名: ${input.displayName}
- メール: ${input.email}

## 評価基準
各項目を1〜5点で評価してください（1=非常に悪い、5=非常に良い）:

1. **issue_comprehension**（課題理解度）— 議題・課題の本質をどの程度正確に理解し、的確な発言をしていたか
2. **value_density**（発言価値密度）— 発言の質が高く、議論に実質的な価値を提供していたか（量より質）
3. **structured_thinking**（構造的思考）— 発言が論理的に整理されており、わかりやすく構造化されていたか
4. **collaborative_influence**（協調的影響力）— 他の参加者の意見を活かし、建設的な議論の展開に貢献していたか
5. **decision_drive**（意思決定推進）— 議論を意思決定に向けて推進し、合意形成に貢献していたか
6. **execution_linkage**（実行連携度）— 議論を具体的なアクション・タスクに結びつけ、実行可能な提案をしていたか

## 出力フォーマット
以下のJSON形式のみで回答してください。JSON以外のテキストは含めないでください。
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
    "quotes": ["<文字起こしからの直接引用1>", "<直接引用2>"],
    "notes": ["<この人物の参加に関する客観的な観察1>", "<観察2>"]
  },
  "summary": "<この人物の貢献を2〜3文で総合的に評価>"
}

## 注意事項
- スコアは必ず1〜5の整数で回答してください
- evidence.quotes は文字起こし内の実際の発言を引用してください
- 日本語で回答してください
- 対象者の発言が少ない・見つからない場合でも、会議への参加態度から推測して評価してください

## 文字起こし
${input.transcript}`;
}

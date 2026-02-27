import type { TfMeetingAttendee } from "../types/meeting.js";
import type { OutMeetingEval, OutIndividualEval } from "../types/evaluation.js";
import type { MeetingReport, IndividualReport } from "../types/api.js";
import { buildMeetingChartUrl, buildIndividualChartUrl } from "../services/chartGenerator.js";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function listToHtml(items: string[] | null): string {
  if (!items || items.length === 0) return "<p>N/A</p>";
  return "<ul>" + items.map((item) => `<li>${escapeHtml(item)}</li>`).join("") + "</ul>";
}

function listToText(items: string[] | null): string {
  if (!items || items.length === 0) return "  N/A";
  return items.map((item) => `  - ${item}`).join("\n");
}

export function buildMeetingReport(
  evalResult: OutMeetingEval,
  attendees: TfMeetingAttendee[],
): MeetingReport {
  const to = attendees.map((a) => a.email);
  const subject = `会議評価レポート: ${evalResult.headline ?? "評価結果"}`;

  let chartUrl = "";
  if (evalResult.evaluation_status === "success") {
    chartUrl = buildMeetingChartUrl({
      goal_clarity: evalResult.goal_clarity ?? 0,
      agenda_structure: evalResult.agenda_structure ?? 0,
      time_efficiency: evalResult.time_efficiency ?? 0,
      participation_balance: evalResult.participation_balance ?? 0,
      decision_quality: evalResult.decision_quality ?? 0,
      action_item_clarity: evalResult.action_item_clarity ?? 0,
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; }
  h1 { color: #1a73e8; }
  h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .score-table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  .score-table td, .score-table th { border: 1px solid #ddd; padding: 8px; text-align: left; }
  .score-table th { background: #f5f5f5; }
</style></head>
<body>
  <h1>${escapeHtml(evalResult.headline ?? "会議評価レポート")}</h1>
  <p>${escapeHtml(evalResult.overall_assessment ?? "")}</p>

  ${chartUrl ? `<img src="${chartUrl}" alt="Radar Chart" width="400" height="400">` : ""}

  <h2>スコア</h2>
  <table class="score-table">
    <tr><th>項目</th><th>スコア</th></tr>
    <tr><td>Goal Clarity</td><td>${evalResult.goal_clarity ?? "-"}/5</td></tr>
    <tr><td>Agenda Structure</td><td>${evalResult.agenda_structure ?? "-"}/5</td></tr>
    <tr><td>Time Efficiency</td><td>${evalResult.time_efficiency ?? "-"}/5</td></tr>
    <tr><td>Participation Balance</td><td>${evalResult.participation_balance ?? "-"}/5</td></tr>
    <tr><td>Decision Quality</td><td>${evalResult.decision_quality ?? "-"}/5</td></tr>
    <tr><td>Action Item Clarity</td><td>${evalResult.action_item_clarity ?? "-"}/5</td></tr>
  </table>

  <h2>良かった点</h2>
  ${listToHtml(evalResult.what_went_well)}

  <h2>改善点</h2>
  ${listToHtml(evalResult.what_to_improve)}

  <h2>決定事項</h2>
  ${listToHtml(evalResult.decisions)}

  <h2>アクションアイテム</h2>
  ${listToHtml(evalResult.action_items)}

  <h2>参加バランス</h2>
  <p>${escapeHtml(evalResult.participation_note ?? "N/A")}</p>
</body>
</html>`;

  const text = `会議評価レポート: ${evalResult.headline ?? "評価結果"}

${evalResult.overall_assessment ?? ""}

スコア:
  Goal Clarity: ${evalResult.goal_clarity ?? "-"}/5
  Agenda Structure: ${evalResult.agenda_structure ?? "-"}/5
  Time Efficiency: ${evalResult.time_efficiency ?? "-"}/5
  Participation Balance: ${evalResult.participation_balance ?? "-"}/5
  Decision Quality: ${evalResult.decision_quality ?? "-"}/5
  Action Item Clarity: ${evalResult.action_item_clarity ?? "-"}/5

良かった点:
${listToText(evalResult.what_went_well)}

改善点:
${listToText(evalResult.what_to_improve)}

決定事項:
${listToText(evalResult.decisions)}

アクションアイテム:
${listToText(evalResult.action_items)}

参加バランス:
  ${evalResult.participation_note ?? "N/A"}`;

  return { to, subject, html, text, chartUrl };
}

export function buildIndividualReports(
  evalResults: OutIndividualEval[],
): IndividualReport[] {
  return evalResults.map((evalResult) => {
    const subject = `個人評価レポート: ${evalResult.email}`;

    let chartUrl = "";
    if (evalResult.evaluation_status === "success") {
      chartUrl = buildIndividualChartUrl({
        issue_comprehension: evalResult.issue_comprehension ?? 0,
        value_density: evalResult.value_density ?? 0,
        structured_thinking: evalResult.structured_thinking ?? 0,
        collaborative_influence: evalResult.collaborative_influence ?? 0,
        decision_drive: evalResult.decision_drive ?? 0,
        execution_linkage: evalResult.execution_linkage ?? 0,
      });
    }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; }
  h1 { color: #1a73e8; }
  h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; }
  .score-table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  .score-table td, .score-table th { border: 1px solid #ddd; padding: 8px; text-align: left; }
  .score-table th { background: #f5f5f5; }
</style></head>
<body>
  <h1>個人評価レポート</h1>
  <p><strong>${escapeHtml(evalResult.email)}</strong></p>

  ${chartUrl ? `<img src="${chartUrl}" alt="Radar Chart" width="400" height="400">` : ""}

  <h2>スコア</h2>
  <table class="score-table">
    <tr><th>項目</th><th>スコア</th></tr>
    <tr><td>Issue Comprehension</td><td>${evalResult.issue_comprehension ?? "-"}/5</td></tr>
    <tr><td>Value Density</td><td>${evalResult.value_density ?? "-"}/5</td></tr>
    <tr><td>Structured Thinking</td><td>${evalResult.structured_thinking ?? "-"}/5</td></tr>
    <tr><td>Collaborative Influence</td><td>${evalResult.collaborative_influence ?? "-"}/5</td></tr>
    <tr><td>Decision Drive</td><td>${evalResult.decision_drive ?? "-"}/5</td></tr>
    <tr><td>Execution Linkage</td><td>${evalResult.execution_linkage ?? "-"}/5</td></tr>
  </table>

  <h2>サマリー</h2>
  <p>${escapeHtml(evalResult.summary ?? "N/A")}</p>

  <h2>エビデンス - 引用</h2>
  ${listToHtml(evalResult.evidence_quotes)}

  <h2>エビデンス - ノート</h2>
  ${listToHtml(evalResult.evidence_notes)}
</body>
</html>`;

    const text = `個人評価レポート: ${evalResult.email}

スコア:
  Issue Comprehension: ${evalResult.issue_comprehension ?? "-"}/5
  Value Density: ${evalResult.value_density ?? "-"}/5
  Structured Thinking: ${evalResult.structured_thinking ?? "-"}/5
  Collaborative Influence: ${evalResult.collaborative_influence ?? "-"}/5
  Decision Drive: ${evalResult.decision_drive ?? "-"}/5
  Execution Linkage: ${evalResult.execution_linkage ?? "-"}/5

サマリー:
  ${evalResult.summary ?? "N/A"}

エビデンス - 引用:
${listToText(evalResult.evidence_quotes)}

エビデンス - ノート:
${listToText(evalResult.evidence_notes)}`;

    return { to: evalResult.email, subject, html, text };
  });
}

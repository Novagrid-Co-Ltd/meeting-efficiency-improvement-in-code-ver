import type { MeetingReport, IndividualReport } from "../types/api.js";
import { buildMeetingChartUrl, buildIndividualChartUrl } from "../services/chartGenerator.js";
import type { AggregatedMonthlyData, MeetingScoreRow, IndividualMonthlyScore } from "./monthlyAggregation.js";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(isoDate: string): string {
  if (!isoDate) return "-";
  return isoDate.slice(0, 10);
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

const MEETING_AXIS_LABELS: Record<string, string> = {
  goal_clarity: "目的の明確さ",
  decision_made: "意思決定",
  todo_clarity: "TODO明確化",
  role_clarity: "役割明確さ",
  time_efficiency: "時間効率",
  participation_balance: "発言バランス",
};

// --- Monthly Summary Report ---

export function buildMonthlySummaryReport(data: AggregatedMonthlyData): MeetingReport {
  const period = `${data.year}年${data.month}月`;
  const to = data.participantEmails;
  const subject = `月次会議評価サマリー: ${period}`;

  const scores = data.meetingScores;
  const chartUrl = buildMeetingChartUrl({
    goal_clarity: scores.goal_clarity.avg,
    decision_made: scores.decision_made.avg,
    todo_clarity: scores.todo_clarity.avg,
    role_clarity: scores.role_clarity.avg,
    time_efficiency: scores.time_efficiency.avg,
    participation_balance: scores.participation_balance.avg,
  });

  const html = buildMonthlySummaryHtml(data, period, chartUrl);
  const text = buildMonthlySummaryText(data, period);

  return { to, subject, html, text, chartUrl };
}

function buildMonthlySummaryHtml(data: AggregatedMonthlyData, period: string, chartUrl: string): string {
  const s = data.meetingScores;
  const axes = [
    { key: "goal_clarity", stats: s.goal_clarity },
    { key: "decision_made", stats: s.decision_made },
    { key: "todo_clarity", stats: s.todo_clarity },
    { key: "role_clarity", stats: s.role_clarity },
    { key: "time_efficiency", stats: s.time_efficiency },
    { key: "participation_balance", stats: s.participation_balance },
  ];

  const axisRowsHtml = axes
    .map(
      (a) =>
        `<tr><td>${MEETING_AXIS_LABELS[a.key]}</td><td>${formatScore(a.stats.avg)}</td><td>${formatScore(a.stats.max)}</td><td>${formatScore(a.stats.min)}</td></tr>`,
    )
    .join("");

  const meetingRowsHtml = data.meetingScoreRows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(formatDate(r.date))}</td><td>${escapeHtml(r.title)}</td><td>${formatScore(r.avgScore)}</td></tr>`,
    )
    .join("");

  const best = s.bestMeeting;
  const worst = s.worstMeeting;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 8px; }
  h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 24px; }
  .score-table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  .score-table td, .score-table th { border: 1px solid #ddd; padding: 8px; text-align: left; }
  .score-table th { background: #f5f5f5; }
  .avg-score { font-size: 1.2em; color: #1a73e8; font-weight: bold; margin: 8px 0; }
  .highlight-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; margin: 8px 0; line-height: 1.6; }
  .warning-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin: 8px 0; line-height: 1.6; }
  .overview { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; }
</style></head>
<body>
  <h1>${escapeHtml(period)} 会議評価 月次サマリー</h1>

  <div class="overview">
    <p><strong>対象期間:</strong> ${escapeHtml(period)}</p>
    <p><strong>会議件数:</strong> ${data.meetingCount}件</p>
    <p><strong>参加者数:</strong> ${data.participantEmails.length}名</p>
    <p class="avg-score">全体平均スコア: ${formatScore(s.overallAvg)} / 5.0</p>
  </div>

  ${chartUrl ? `<img src="${chartUrl}" alt="Radar Chart" width="400" height="400">` : ""}

  <h2>6軸スコア</h2>
  <table class="score-table">
    <tr><th>項目</th><th>平均</th><th>最高</th><th>最低</th></tr>
    ${axisRowsHtml}
  </table>

  <h2>会議別一覧</h2>
  <table class="score-table">
    <tr><th>日付</th><th>会議名</th><th>平均スコア</th></tr>
    ${meetingRowsHtml}
  </table>

  ${best ? `<h2>ベスト会議</h2><div class="highlight-box"><strong>${escapeHtml(best.title)}</strong> (${escapeHtml(formatDate(best.date))})<br>平均スコア: ${formatScore(best.avgScore)}</div>` : ""}

  ${worst ? `<h2>改善が必要な会議</h2><div class="warning-box"><strong>${escapeHtml(worst.title)}</strong> (${escapeHtml(formatDate(worst.date))})<br>平均スコア: ${formatScore(worst.avgScore)}</div>` : ""}

</body>
</html>`;
}

function buildMonthlySummaryText(data: AggregatedMonthlyData, period: string): string {
  const s = data.meetingScores;
  const axes = [
    { key: "goal_clarity", stats: s.goal_clarity },
    { key: "decision_made", stats: s.decision_made },
    { key: "todo_clarity", stats: s.todo_clarity },
    { key: "role_clarity", stats: s.role_clarity },
    { key: "time_efficiency", stats: s.time_efficiency },
    { key: "participation_balance", stats: s.participation_balance },
  ];

  const axisLines = axes
    .map((a) => `  ${MEETING_AXIS_LABELS[a.key]}: 平均${formatScore(a.stats.avg)} / 最高${formatScore(a.stats.max)} / 最低${formatScore(a.stats.min)}`)
    .join("\n");

  const meetingLines = data.meetingScoreRows
    .map((r) => `  ${formatDate(r.date)} | ${r.title} | ${formatScore(r.avgScore)}`)
    .join("\n");

  const best = s.bestMeeting;
  const worst = s.worstMeeting;

  return `━━━━━━━━━━━━━━━━━━
■ ${period} 会議評価 月次サマリー
━━━━━━━━━━━━━━━━━━

■ 概要
  対象期間: ${period}
  会議件数: ${data.meetingCount}件
  参加者数: ${data.participantEmails.length}名
  全体平均スコア: ${formatScore(s.overallAvg)} / 5.0

■ 6軸スコア
${axisLines}

■ 会議別一覧
${meetingLines || "  データなし"}
${best ? `\n■ ベスト会議\n  ${best.title} (${formatDate(best.date)})\n  平均スコア: ${formatScore(best.avgScore)}` : ""}
${worst ? `\n■ 改善が必要な会議\n  ${worst.title} (${formatDate(worst.date)})\n  平均スコア: ${formatScore(worst.avgScore)}` : ""}`;
}

// --- Monthly Individual Reports ---

export function buildMonthlyIndividualReports(data: AggregatedMonthlyData): IndividualReport[] {
  const period = `${data.year}年${data.month}月`;
  return data.individualScores.map((ind) => buildOneIndividualReport(ind, period));
}

function buildOneIndividualReport(ind: IndividualMonthlyScore, period: string): IndividualReport {
  const subject = `月次個人評価レポート: ${period}`;

  const chartUrl = buildIndividualChartUrl({
    issue_comprehension: ind.issue_comprehension,
    value_density: ind.value_density,
    structured_thinking: ind.structured_thinking,
    collaborative_influence: ind.collaborative_influence,
    decision_drive: ind.decision_drive,
    execution_linkage: ind.execution_linkage,
  });

  const html = buildIndividualHtml(ind, period, chartUrl);
  const text = buildIndividualText(ind, period);

  return { to: ind.email, subject, html, text };
}

function buildIndividualHtml(ind: IndividualMonthlyScore, period: string, chartUrl: string): string {
  const axisRows = [
    { label: "課題理解度", score: ind.issue_comprehension },
    { label: "発言価値密度", score: ind.value_density },
    { label: "構造的思考", score: ind.structured_thinking },
    { label: "協調的影響力", score: ind.collaborative_influence },
    { label: "意思決定推進", score: ind.decision_drive },
    { label: "実行連携度", score: ind.execution_linkage },
  ];

  const axisRowsHtml = axisRows
    .map((a) => `<tr><td>${a.label}</td><td>${formatScore(a.score)}</td></tr>`)
    .join("");

  const meetingRowsHtml = ind.meetings
    .map(
      (m) =>
        `<tr><td>${escapeHtml(formatDate(m.date))}</td><td>${escapeHtml(m.title)}</td><td>${formatScore(m.avgScore)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; color: #333; }
  h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 8px; }
  h2 { color: #333; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 24px; }
  .score-table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  .score-table td, .score-table th { border: 1px solid #ddd; padding: 8px; text-align: left; }
  .score-table th { background: #f5f5f5; }
  .avg-score { font-size: 1.2em; color: #1a73e8; font-weight: bold; margin: 8px 0; }
  .highlight-box { background: #e8f5e9; border-left: 4px solid #4caf50; padding: 12px; margin: 8px 0; line-height: 1.6; }
  .warning-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 12px; margin: 8px 0; line-height: 1.6; }
  .overview { background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0; }
</style></head>
<body>
  <h1>${escapeHtml(period)} 個人月次評価レポート: ${escapeHtml(ind.displayName)}</h1>

  <div class="overview">
    <p><strong>対象者:</strong> ${escapeHtml(ind.displayName)} (${escapeHtml(ind.email)})</p>
    <p><strong>参加会議数:</strong> ${ind.meetingCount}件</p>
    <p class="avg-score">全体平均スコア: ${formatScore(ind.overallAvg)} / 5.0</p>
  </div>

  ${chartUrl ? `<img src="${chartUrl}" alt="Radar Chart" width="400" height="400">` : ""}

  <h2>6軸スコア</h2>
  <table class="score-table">
    <tr><th>項目</th><th>月間平均</th></tr>
    ${axisRowsHtml}
  </table>

  <h2>会議別スコア推移</h2>
  <table class="score-table">
    <tr><th>日付</th><th>会議名</th><th>平均スコア</th></tr>
    ${meetingRowsHtml}
  </table>

  <h2>最も高い軸</h2>
  <div class="highlight-box"><strong>${escapeHtml(ind.highestAxis.name)}</strong>: ${formatScore(ind.highestAxis.score)}</div>

  <h2>最も低い軸</h2>
  <div class="warning-box"><strong>${escapeHtml(ind.lowestAxis.name)}</strong>: ${formatScore(ind.lowestAxis.score)}</div>

</body>
</html>`;
}

function buildIndividualText(ind: IndividualMonthlyScore, period: string): string {
  const axisLines = [
    `  課題理解度: ${formatScore(ind.issue_comprehension)}`,
    `  発言価値密度: ${formatScore(ind.value_density)}`,
    `  構造的思考: ${formatScore(ind.structured_thinking)}`,
    `  協調的影響力: ${formatScore(ind.collaborative_influence)}`,
    `  意思決定推進: ${formatScore(ind.decision_drive)}`,
    `  実行連携度: ${formatScore(ind.execution_linkage)}`,
  ].join("\n");

  const meetingLines = ind.meetings
    .map((m) => `  ${formatDate(m.date)} | ${m.title} | ${formatScore(m.avgScore)}`)
    .join("\n");

  return `━━━━━━━━━━━━━━━━━━
■ ${period} 個人月次評価レポート: ${ind.displayName}
━━━━━━━━━━━━━━━━━━

■ 概要
  対象者: ${ind.displayName} (${ind.email})
  参加会議数: ${ind.meetingCount}件
  全体平均スコア: ${formatScore(ind.overallAvg)} / 5.0

■ 6軸スコア
${axisLines}

■ 会議別スコア推移
${meetingLines || "  データなし"}

■ 最も高い軸: ${ind.highestAxis.name} (${formatScore(ind.highestAxis.score)})
■ 最も低い軸: ${ind.lowestAxis.name} (${formatScore(ind.lowestAxis.score)})`;
}

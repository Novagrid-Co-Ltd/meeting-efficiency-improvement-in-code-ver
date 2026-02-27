import { describe, it, expect } from "vitest";
import { buildMeetingReport, buildIndividualReports } from "../../src/logic/reportFormatter.js";
import type { OutMeetingEval, OutIndividualEval } from "../../src/types/evaluation.js";
import type { TfMeetingAttendee } from "../../src/types/meeting.js";

const mockMeetingEval: OutMeetingEval = {
  meet_instance_key: "event-001__2026-02-20T10:00:00+09:00",
  evaluation_status: "success",
  prompt_version: "v1.1.0",
  goal_clarity: 4,
  decision_made: 4,
  todo_clarity: 5,
  role_clarity: 3,
  time_efficiency: 4,
  participation_balance: 3,
  headline: "プロジェクト進捗確認",
  overall_assessment: "効率的な会議でした。アジェンダに沿って議論が進み、具体的な決定がなされました。",
  key_topics: ["リリーススケジュール確認", "テスト進捗報告", "タスクアサイン"],
  strength_axis: "todo_clarity",
  strength_reason: "次のアクションが具体的に定義され、担当者と期限が明確に設定された。",
  weakness_axis: "participation_balance",
  weakness_reason: "発言が特定の参加者に偏っていた。他のメンバーの発言機会が限られていた。",
  special_notes: ["時間管理が良好", "重要な意思決定がなされた"],
  decisions: ["リリース日確定"],
  action_items: ["[high] 田中: テスト完了"],
  recommendations: ["次回はラウンドロビン形式を導入して発言バランスを改善する", "アジェンダに時間配分を明記する"],
  participation_note: "田中と佐藤が主に発言。他の参加者の発言機会を増やすことが望ましい。",
  raw_response: null,
};

const mockAttendees: TfMeetingAttendee[] = [
  { meet_instance_key: "event-001__2026-02-20T10:00:00+09:00", email: "tanaka@novagrid.tech", display_name: "田中", response_status: "accepted", is_organizer: true, person_id: "pid-001", resolve_method: "email_exact", confidence: 1 },
  { meet_instance_key: "event-001__2026-02-20T10:00:00+09:00", email: "sato@novagrid.tech", display_name: "佐藤", response_status: "accepted", is_organizer: false, person_id: "pid-002", resolve_method: "email_exact", confidence: 1 },
];

const mockIndividualEvals: OutIndividualEval[] = [
  {
    meet_instance_key: "event-001__2026-02-20T10:00:00+09:00",
    email: "tanaka@novagrid.tech",
    evaluation_status: "success",
    prompt_version: "v1.1.0",
    issue_comprehension: 5,
    value_density: 4,
    structured_thinking: 4,
    collaborative_influence: 3,
    decision_drive: 4,
    execution_linkage: 5,
    evidence_quotes: ["テストがまだ完了していません"],
    evidence_notes: ["進行をリードしていた"],
    strengths: ["課題の本質を的確に把握している", "アクションアイテムを率先して引き受ける"],
    improvements: ["他の参加者に意見を求める場面を増やす"],
    communication_style: "主導型のコミュニケーションスタイル。具体的な数値に基づく論理的な発言が特徴。",
    summary: "効果的に貢献し、課題の明確化とアクションアイテムの設定に大きく寄与した。",
    raw_response: null,
  },
];

describe("buildMeetingReport", () => {
  it("includes all attendee emails in to field", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.to).toContain("tanaka@novagrid.tech");
    expect(report.to).toContain("sato@novagrid.tech");
    expect(report.to).toHaveLength(2);
  });

  it("includes scores in HTML", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.html).toContain("4/5");
    expect(report.html).toContain("5/5");
    expect(report.html).toContain("3/5");
  });

  it("includes Japanese axis labels in text", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.text).toContain("目的の明確さ: 4/5");
    expect(report.text).toContain("TODO明確化: 5/5");
    expect(report.text).toContain("発言バランス: 3/5");
  });

  it("includes strength and weakness analysis", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.html).toContain("強み軸");
    expect(report.html).toContain("弱み軸");
    expect(report.text).toContain("強み軸: TODO明確化");
    expect(report.text).toContain("弱み軸: 発言バランス");
  });

  it("includes key topics section", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.html).toContain("主な議題");
    expect(report.html).toContain("リリーススケジュール確認");
    expect(report.text).toContain("主な議題");
  });

  it("includes recommendations section", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.html).toContain("改善提言");
    expect(report.html).toContain("ラウンドロビン");
    expect(report.text).toContain("改善提言");
  });

  it("includes average score", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.html).toContain("総合平均スコア");
    expect(report.text).toContain("総合平均スコア");
  });

  it("includes headline in subject", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.subject).toContain("プロジェクト進捗確認");
  });

  it("generates chart URL for successful eval", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.chartUrl).toContain("quickchart.io");
  });
});

describe("buildIndividualReports", () => {
  it("creates one report per eval result", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports).toHaveLength(1);
  });

  it("sends to the individual's email only", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.to).toBe("tanaka@novagrid.tech");
  });

  it("includes Japanese axis labels in HTML", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.html).toContain("課題理解度");
    expect(reports[0]!.html).toContain("5/5");
    expect(reports[0]!.html).toContain("4/5");
  });

  it("includes Japanese axis labels in text", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.text).toContain("課題理解度: 5/5");
    expect(reports[0]!.text).toContain("実行連携度: 5/5");
  });

  it("includes strengths section", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.html).toContain("強み");
    expect(reports[0]!.html).toContain("課題の本質");
    expect(reports[0]!.text).toContain("強み");
  });

  it("includes improvements section", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.html).toContain("改善提案");
    expect(reports[0]!.text).toContain("改善提案");
  });

  it("includes communication style", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.html).toContain("コミュニケーションスタイル");
    expect(reports[0]!.text).toContain("コミュニケーションスタイル");
  });

  it("includes average score", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.html).toContain("総合平均スコア");
    expect(reports[0]!.text).toContain("総合平均スコア");
  });
});

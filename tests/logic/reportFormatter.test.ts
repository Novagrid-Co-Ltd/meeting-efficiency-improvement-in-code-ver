import { describe, it, expect } from "vitest";
import { buildMeetingReport, buildIndividualReports } from "../../src/logic/reportFormatter.js";
import type { OutMeetingEval, OutIndividualEval } from "../../src/types/evaluation.js";
import type { TfMeetingAttendee } from "../../src/types/meeting.js";

const mockMeetingEval: OutMeetingEval = {
  meet_instance_key: "event-001__2026-02-20T10:00:00+09:00",
  evaluation_status: "success",
  prompt_version: "v0.1.0",
  goal_clarity: 4,
  agenda_structure: 3,
  time_efficiency: 4,
  participation_balance: 3,
  decision_quality: 4,
  action_item_clarity: 5,
  headline: "プロジェクト進捗確認",
  overall_assessment: "効率的な会議でした。",
  what_went_well: ["時間管理", "決定事項の明確さ"],
  what_to_improve: ["参加バランス"],
  decisions: ["リリース日確定"],
  action_items: ["田中: テスト完了"],
  participation_note: "2名が主に発言",
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
    prompt_version: "v0.1.0",
    issue_comprehension: 5,
    value_density: 4,
    structured_thinking: 4,
    collaborative_influence: 3,
    decision_drive: 4,
    execution_linkage: 5,
    evidence_quotes: ["テストがまだ完了していません"],
    evidence_notes: ["進行をリード"],
    summary: "効果的に貢献",
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

  it("includes scores in text", () => {
    const report = buildMeetingReport(mockMeetingEval, mockAttendees);
    expect(report.text).toContain("Goal Clarity: 4/5");
    expect(report.text).toContain("Action Item Clarity: 5/5");
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

  it("includes scores in HTML", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.html).toContain("5/5");
    expect(reports[0]!.html).toContain("4/5");
  });

  it("includes summary in text", () => {
    const reports = buildIndividualReports(mockIndividualEvals);
    expect(reports[0]!.text).toContain("Issue Comprehension: 5/5");
  });
});

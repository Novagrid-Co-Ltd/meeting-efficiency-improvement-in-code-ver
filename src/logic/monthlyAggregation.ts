import { createClient } from "@supabase/supabase-js";
import { getConfig } from "../config.js";
import type { RowMeetingRaw, TfMeetingAttendee } from "../types/meeting.js";
import type { OutMeetingEval, OutIndividualEval } from "../types/evaluation.js";
import { logger } from "../utils/logger.js";

function getSupabase() {
  const cfg = getConfig();
  return createClient(cfg.supabaseUrl, cfg.supabaseServiceKey);
}

// --- Types for aggregated data ---

export interface MeetingAxisStats {
  avg: number;
  min: number;
  max: number;
}

export interface AggregatedMeetingScores {
  goal_clarity: MeetingAxisStats;
  decision_made: MeetingAxisStats;
  todo_clarity: MeetingAxisStats;
  role_clarity: MeetingAxisStats;
  time_efficiency: MeetingAxisStats;
  participation_balance: MeetingAxisStats;
  overallAvg: number;
  bestMeeting: { meetInstanceKey: string; title: string; date: string; avgScore: number } | null;
  worstMeeting: { meetInstanceKey: string; title: string; date: string; avgScore: number } | null;
}

export interface MeetingScoreRow {
  meetInstanceKey: string;
  title: string;
  date: string;
  avgScore: number;
  goal_clarity: number;
  decision_made: number;
  todo_clarity: number;
  role_clarity: number;
  time_efficiency: number;
  participation_balance: number;
}

export interface IndividualMonthlyScore {
  email: string;
  displayName: string;
  meetingCount: number;
  issue_comprehension: number;
  value_density: number;
  structured_thinking: number;
  collaborative_influence: number;
  decision_drive: number;
  execution_linkage: number;
  overallAvg: number;
  highestAxis: { name: string; score: number };
  lowestAxis: { name: string; score: number };
  meetings: { meetInstanceKey: string; title: string; date: string; avgScore: number }[];
}

export interface MonthlyData {
  year: number;
  month: number;
  meetings: RowMeetingRaw[];
  meetingEvals: OutMeetingEval[];
  individualEvals: OutIndividualEval[];
  attendees: TfMeetingAttendee[];
}

export interface AggregatedMonthlyData {
  year: number;
  month: number;
  meetingCount: number;
  participantEmails: string[];
  meetingScores: AggregatedMeetingScores;
  meetingScoreRows: MeetingScoreRow[];
  individualScores: IndividualMonthlyScore[];
}

// --- Data fetching ---

export async function fetchMonthlyData(year: number, month: number): Promise<MonthlyData> {
  const sb = getSupabase();

  const startDate = `${year}-${String(month).padStart(2, "0")}-01T00:00:00`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01T00:00:00`;

  logger.info("Fetching monthly data", { year, month, startDate, endDate });

  // 1. Get meetings in range
  const { data: meetings, error: meetingsErr } = await sb
    .from("row_meeting_raw")
    .select("*")
    .gte("event_start", startDate)
    .lt("event_start", endDate)
    .order("event_start", { ascending: true });

  if (meetingsErr) throw meetingsErr;
  const meetingRows = (meetings ?? []) as RowMeetingRaw[];
  const meetKeys = meetingRows.map((m) => m.meet_instance_key);

  if (meetKeys.length === 0) {
    return { year, month, meetings: [], meetingEvals: [], individualEvals: [], attendees: [] };
  }

  // 2. Get successful meeting evaluations
  const { data: meetingEvals, error: meErr } = await sb
    .from("out_meeting_eval")
    .select("*")
    .in("meet_instance_key", meetKeys)
    .eq("evaluation_status", "success");

  if (meErr) throw meErr;

  // 3. Get successful individual evaluations
  const { data: individualEvals, error: ieErr } = await sb
    .from("out_individual_eval")
    .select("*")
    .in("meet_instance_key", meetKeys)
    .eq("evaluation_status", "success");

  if (ieErr) throw ieErr;

  // 4. Get attendees
  const { data: attendees, error: atErr } = await sb
    .from("tf_meeting_attendee")
    .select("*")
    .in("meet_instance_key", meetKeys);

  if (atErr) throw atErr;

  logger.info("Monthly data fetched", {
    meetings: meetingRows.length,
    meetingEvals: (meetingEvals ?? []).length,
    individualEvals: (individualEvals ?? []).length,
    attendees: (attendees ?? []).length,
  });

  return {
    year,
    month,
    meetings: meetingRows,
    meetingEvals: (meetingEvals ?? []) as OutMeetingEval[],
    individualEvals: (individualEvals ?? []) as OutIndividualEval[],
    attendees: (attendees ?? []) as TfMeetingAttendee[],
  };
}

// --- Aggregation ---

const MEETING_AXES = [
  "goal_clarity",
  "decision_made",
  "todo_clarity",
  "role_clarity",
  "time_efficiency",
  "participation_balance",
] as const;

type MeetingAxis = (typeof MEETING_AXES)[number];

function meetingAvgScore(ev: OutMeetingEval): number {
  let sum = 0;
  for (const axis of MEETING_AXES) {
    sum += ev[axis] ?? 0;
  }
  return sum / 6;
}

export function aggregateMeetingScores(
  meetingEvals: OutMeetingEval[],
  meetings: RowMeetingRaw[],
): { scores: AggregatedMeetingScores; rows: MeetingScoreRow[] } {
  const meetingMap = new Map(meetings.map((m) => [m.meet_instance_key, m]));

  // Per-meeting score rows
  const rows: MeetingScoreRow[] = meetingEvals.map((ev) => {
    const meeting = meetingMap.get(ev.meet_instance_key);
    return {
      meetInstanceKey: ev.meet_instance_key,
      title: meeting?.event_summary ?? ev.meet_instance_key,
      date: meeting?.event_start ?? "",
      avgScore: meetingAvgScore(ev),
      goal_clarity: ev.goal_clarity ?? 0,
      decision_made: ev.decision_made ?? 0,
      todo_clarity: ev.todo_clarity ?? 0,
      role_clarity: ev.role_clarity ?? 0,
      time_efficiency: ev.time_efficiency ?? 0,
      participation_balance: ev.participation_balance ?? 0,
    };
  });

  rows.sort((a, b) => a.date.localeCompare(b.date));

  // Axis stats
  const axisStats: Record<string, MeetingAxisStats> = {};
  for (const axis of MEETING_AXES) {
    const values = meetingEvals.map((ev) => ev[axis] ?? 0);
    axisStats[axis] = {
      avg: values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  const overallAvg =
    meetingEvals.length > 0
      ? meetingEvals.reduce((s, ev) => s + meetingAvgScore(ev), 0) / meetingEvals.length
      : 0;

  const best = rows.length > 0 ? rows.reduce((a, b) => (a.avgScore >= b.avgScore ? a : b)) : null;
  const worst = rows.length > 0 ? rows.reduce((a, b) => (a.avgScore <= b.avgScore ? a : b)) : null;

  return {
    scores: {
      goal_clarity: axisStats["goal_clarity"]!,
      decision_made: axisStats["decision_made"]!,
      todo_clarity: axisStats["todo_clarity"]!,
      role_clarity: axisStats["role_clarity"]!,
      time_efficiency: axisStats["time_efficiency"]!,
      participation_balance: axisStats["participation_balance"]!,
      overallAvg,
      bestMeeting: best
        ? { meetInstanceKey: best.meetInstanceKey, title: best.title, date: best.date, avgScore: best.avgScore }
        : null,
      worstMeeting: worst
        ? { meetInstanceKey: worst.meetInstanceKey, title: worst.title, date: worst.date, avgScore: worst.avgScore }
        : null,
    },
    rows,
  };
}

const INDIVIDUAL_AXES = [
  "issue_comprehension",
  "value_density",
  "structured_thinking",
  "collaborative_influence",
  "decision_drive",
  "execution_linkage",
] as const;

type IndividualAxis = (typeof INDIVIDUAL_AXES)[number];

const INDIVIDUAL_AXIS_LABELS: Record<IndividualAxis, string> = {
  issue_comprehension: "課題理解度",
  value_density: "発言価値密度",
  structured_thinking: "構造的思考",
  collaborative_influence: "協調的影響力",
  decision_drive: "意思決定推進",
  execution_linkage: "実行連携度",
};

export function aggregateIndividualScores(
  individualEvals: OutIndividualEval[],
  meetings: RowMeetingRaw[],
  attendees: TfMeetingAttendee[],
): IndividualMonthlyScore[] {
  const meetingMap = new Map(meetings.map((m) => [m.meet_instance_key, m]));

  // Build email → display_name from attendees
  const nameMap = new Map<string, string>();
  for (const a of attendees) {
    if (!nameMap.has(a.email)) {
      nameMap.set(a.email, a.display_name);
    }
  }

  // Group by email
  const grouped = new Map<string, OutIndividualEval[]>();
  for (const ev of individualEvals) {
    const list = grouped.get(ev.email) ?? [];
    list.push(ev);
    grouped.set(ev.email, list);
  }

  const results: IndividualMonthlyScore[] = [];

  for (const [email, evals] of grouped) {
    const axisAvgs: Record<string, number> = {};
    for (const axis of INDIVIDUAL_AXES) {
      const values = evals.map((ev) => ev[axis] ?? 0);
      axisAvgs[axis] = values.reduce((s, v) => s + v, 0) / values.length;
    }

    const overallAvg = INDIVIDUAL_AXES.reduce((s, a) => s + axisAvgs[a]!, 0) / 6;

    // Highest / lowest axis
    let highest = { name: INDIVIDUAL_AXIS_LABELS[INDIVIDUAL_AXES[0]], score: axisAvgs[INDIVIDUAL_AXES[0]]! };
    let lowest = { name: INDIVIDUAL_AXIS_LABELS[INDIVIDUAL_AXES[0]], score: axisAvgs[INDIVIDUAL_AXES[0]]! };
    for (const axis of INDIVIDUAL_AXES) {
      const score = axisAvgs[axis]!;
      if (score > highest.score) highest = { name: INDIVIDUAL_AXIS_LABELS[axis], score };
      if (score < lowest.score) lowest = { name: INDIVIDUAL_AXIS_LABELS[axis], score };
    }

    // Per-meeting scores
    const meetingScores = evals.map((ev) => {
      const meeting = meetingMap.get(ev.meet_instance_key);
      const avg = INDIVIDUAL_AXES.reduce((s, a) => s + (ev[a] ?? 0), 0) / 6;
      return {
        meetInstanceKey: ev.meet_instance_key,
        title: meeting?.event_summary ?? ev.meet_instance_key,
        date: meeting?.event_start ?? "",
        avgScore: avg,
      };
    });
    meetingScores.sort((a, b) => a.date.localeCompare(b.date));

    results.push({
      email,
      displayName: nameMap.get(email) ?? email,
      meetingCount: evals.length,
      issue_comprehension: axisAvgs["issue_comprehension"]!,
      value_density: axisAvgs["value_density"]!,
      structured_thinking: axisAvgs["structured_thinking"]!,
      collaborative_influence: axisAvgs["collaborative_influence"]!,
      decision_drive: axisAvgs["decision_drive"]!,
      execution_linkage: axisAvgs["execution_linkage"]!,
      overallAvg,
      highestAxis: highest,
      lowestAxis: lowest,
      meetings: meetingScores,
    });
  }

  results.sort((a, b) => a.email.localeCompare(b.email));
  return results;
}

export function aggregateMonthlyData(data: MonthlyData): AggregatedMonthlyData {
  const { scores, rows } = aggregateMeetingScores(data.meetingEvals, data.meetings);
  const individualScores = aggregateIndividualScores(data.individualEvals, data.meetings, data.attendees);

  // Unique participant emails from attendees
  const emailSet = new Set<string>();
  for (const a of data.attendees) {
    emailSet.add(a.email);
  }

  return {
    year: data.year,
    month: data.month,
    meetingCount: data.meetings.length,
    participantEmails: Array.from(emailSet).sort(),
    meetingScores: scores,
    meetingScoreRows: rows,
    individualScores,
  };
}

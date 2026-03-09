/**
 * バックフィルスクリプト: Drive 内の文字起こしドキュメントを一括処理
 *
 * Usage:
 *   npx tsx src/batch/backfill.ts              # 本実行
 *   npx tsx src/batch/backfill.ts --dry-run    # 対象一覧のみ出力
 *
 * 動作:
 *   1. Google Drive フォルダ内の全ドキュメントを取得
 *   2. 各ドキュメントから eid を抽出
 *   3. Google Calendar 全イベントと照合
 *   4. カレンダーにマッチしないドキュメントはスキップ
 *   5. 処理済み会議はスキップ
 *   6. process-meeting パイプラインを順次実行
 */

import "dotenv/config";
import { getConfig } from "../config.js";
import { getAuthClient } from "../services/googleAuth.js";
import * as googleDocs from "../services/googleDocs.js";
import * as googleCalendar from "../services/googleCalendar.js";
import * as supabase from "../services/supabase.js";
import { extractTranscript } from "../logic/extractTranscript.js";
import { matchEvent } from "../logic/matchEvent.js";
import { buildRowData } from "../logic/buildRowData.js";
import { buildAttendees } from "../logic/buildAttendees.js";
import { buildIndividualInputs } from "../logic/buildIndividualInput.js";
import * as meetingEval from "../logic/meetingEval.js";
import * as individualEval from "../logic/individualEval.js";
import { logger } from "../utils/logger.js";
import { createClient } from "@supabase/supabase-js";

// ──────────────────────────────────────
// Drive API: フォルダ内ファイル一覧
// ──────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

interface DriveListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  const client = await getAuthClient();
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: "nextPageToken,files(id,name,mimeType,createdTime)",
      pageSize: "100",
      orderBy: "createdTime desc",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `https://www.googleapis.com/drive/v3/files?${params}`;
    const res = await client.request<DriveListResponse>({ url });

    if (res.data.files) {
      allFiles.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return allFiles;
}

// ──────────────────────────────────────
// メイン処理
// ──────────────────────────────────────

interface BackfillTarget {
  fileId: string;
  fileName: string;
  eventId: string;
  eventSummary: string;
  eventStart: string;
  meetInstanceKey: string;
}

const INTERVAL_MS = 5000; // API レートリミット対策: 5秒間隔

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CalendarListResponse {
  items?: googleCalendar.CalendarEvent[];
  nextPageToken?: string;
}

/**
 * Calendar の全イベントを取得（ページネーション対応）
 */
async function getAllCalendarEvents(
  calendarId: string,
): Promise<googleCalendar.CalendarEvent[]> {
  const client = await getAuthClient();
  const allEvents: googleCalendar.CalendarEvent[] = [];
  let pageToken: string | undefined;
  const now = new Date();

  do {
    const params = new URLSearchParams({
      timeMin: "2024-01-01T00:00:00Z",
      timeMax: now.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
    const res = await client.request<CalendarListResponse>({ url });

    if (res.data.items) {
      allEvents.push(...res.data.items);
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return allEvents;
}

async function discoverTargets(): Promise<BackfillTarget[]> {
  const config = getConfig();
  const targets: BackfillTarget[] = [];

  // 1. Drive フォルダ内の全ドキュメント取得
  console.log(`\n📂 Drive フォルダ (${config.driveFolderId}) のファイルを取得中...`);
  const files = await listDriveFiles(config.driveFolderId);
  console.log(`   → ${files.length} 件のドキュメントを検出\n`);

  // 2. Calendar の全イベントを取得（ページネーション対応）
  console.log(`📅 Calendar の全イベントを取得中...`);
  const allEvents = await getAllCalendarEvents(config.calendarId);
  console.log(`   → ${allEvents.length} 件のイベントを検出\n`);

  // 3. 処理済み meetInstanceKey を Supabase から取得
  console.log("📦 処理済み会議を確認中...");
  const cfg = getConfig();
  const sb = createClient(cfg.supabaseUrl, cfg.supabaseServiceKey);
  const { data: existingRows } = await sb
    .from("eval_meeting_raw")
    .select("meet_instance_key");
  const processedKeys = new Set((existingRows ?? []).map((r: { meet_instance_key: string }) => r.meet_instance_key));
  console.log(`   → ${processedKeys.size} 件が処理済み\n`);

  // 4. 各ドキュメントからeidを抽出し、カレンダーイベントとマッチング
  console.log("🔍 ドキュメントとイベントのマッチング中...\n");

  for (const file of files) {
    try {
      const doc = await googleDocs.getDocument(file.id);
      const extracted = extractTranscript(doc);

      if (!extracted.eid) {
        continue;
      }

      // eid でカレンダーイベントとマッチ
      let matched;
      try {
        matched = matchEvent(allEvents, extracted.eid);
      } catch {
        // カレンダーに該当イベントなし → スキップ
        continue;
      }

      // 処理済みならスキップ
      if (processedKeys.has(matched.meetInstanceKey)) {
        continue;
      }

      const ev = allEvents.find((e) => e.id === matched.eventId);
      targets.push({
        fileId: file.id,
        fileName: file.name,
        eventId: matched.eventId,
        eventSummary: ev?.summary ?? "",
        eventStart: ev?.start?.dateTime ?? ev?.start?.date ?? "",
        meetInstanceKey: matched.meetInstanceKey,
      });
    } catch (err) {
      // 文字起こしタブなし等は静かにスキップ
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("TRANSCRIPT_NOT_FOUND")) {
        console.log(`   ⚠️ スキップ: ${file.name} — ${msg}`);
      }
    }
  }

  return targets;
}

async function processSingle(target: BackfillTarget): Promise<"success" | "failed"> {
  const config = getConfig();

  try {
    // 1. Docs取得 + Transcript抽出
    const doc = await googleDocs.getDocument(target.fileId);
    const extracted = extractTranscript(doc);

    // 2. Calendar詳細取得
    const eventDetail = await googleCalendar.getEvent(config.calendarId, target.eventId);

    // 3. ROW層
    const rowData = buildRowData({
      extracted,
      eventDetail,
      meetInstanceKey: target.meetInstanceKey,
      eventId: target.eventId,
    });
    const savedRow = await supabase.upsertRowData(rowData);

    // 4. TRANSFORM層
    const personIdentities = await supabase.getPersonIdentities();
    const attendees = buildAttendees(eventDetail.attendees ?? [], personIdentities);
    await supabase.upsertAttendees(savedRow.meet_instance_key, attendees);
    const individualInputs = buildIndividualInputs(savedRow, attendees);
    await supabase.upsertIndividualInputs(individualInputs);

    // 5. 会議評価
    await meetingEval.run(savedRow);

    // 6. 個人評価
    await individualEval.runAll(individualInputs);

    return "success";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Backfill processing failed", {
      meetInstanceKey: target.meetInstanceKey,
      error: msg,
    });
    return "failed";
  }
}

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(isDryRun ? "🔍 バックフィル (DRY RUN)" : "🚀 バックフィル (本実行)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 対象検出
  const targets = await discoverTargets();

  if (targets.length === 0) {
    console.log("\n✅ 処理対象が見つかりませんでした。終了します。");
    process.exit(0);
  }

  // 対象一覧表示
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 マッチ結果: ${targets.length} 件`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i]!;
    console.log(`  ${i + 1}. ${t.eventStart}  ${t.eventSummary}`);
    console.log(`     Doc: ${t.fileName} (${t.fileId})`);
    console.log(`     Key: ${t.meetInstanceKey}`);
    console.log("");
  }

  if (isDryRun) {
    console.log("🔍 DRY RUN モードのため処理は実行しません。");
    console.log("   本実行するには --dry-run を外して再実行してください。");
    process.exit(0);
  }

  // 本実行
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("⏳ 処理開始");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i]!;
    const progress = `[${i + 1}/${targets.length}]`;

    console.log(`${progress} 処理中: ${target.eventSummary} (${target.eventStart})`);

    const result = await processSingle(target);

    if (result === "success") {
      successCount++;
      console.log(`${progress} ✅ 成功 → ${target.meetInstanceKey}`);
    } else {
      failCount++;
      console.log(`${progress} ❌ 失敗 → ${target.meetInstanceKey}`);
    }

    // レートリミット対策: 最後以外はインターバルを挟む
    if (i < targets.length - 1) {
      console.log(`   ⏳ ${INTERVAL_MS / 1000}秒待機...\n`);
      await sleep(INTERVAL_MS);
    }
  }

  // 結果サマリー
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 処理完了`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  合計: ${targets.length} 件`);
  console.log(`  成功: ${successCount} 件`);
  console.log(`  失敗: ${failCount} 件`);
  console.log("");

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

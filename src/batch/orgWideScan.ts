/**
 * 全社スキャンバッチ: 全社員のDriveを走査して文字起こしファイルを発見・処理
 *
 * Usage:
 *   npx tsx src/batch/orgWideScan.ts              # 本実行
 *   npx tsx src/batch/orgWideScan.ts --dry-run    # 対象一覧のみ出力
 *
 * 動作:
 *   1. Admin SDK で全ドメインユーザー取得
 *   2. 各ユーザーの Drive を SA 委任で走査
 *   3. 文字起こしドキュメントから eid 抽出
 *   4. そのユーザーのカレンダーからイベントマッチ
 *   5. 未処理なら既存パイプライン（process-meeting 相当）を実行
 */

import "dotenv/config";
import { getConfig } from "../config.js";
import { isServiceAccountMode, getAuthClient } from "../services/googleAuth.js";
import { listDomainUsers, type WorkspaceUser } from "../services/googleAdmin.js";
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
// Drive API: ユーザーの Drive を走査
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

/**
 * 指定ユーザーの Drive から文字起こしドキュメントを検索
 */
async function searchUserDriveForTranscripts(userEmail: string): Promise<DriveFile[]> {
  const client = await getAuthClient(userEmail);
  const allFiles: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.document' AND name contains '文字起こし' AND trashed=false",
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
// ターゲット検出
// ──────────────────────────────────────

interface OrgScanTarget {
  userEmail: string;
  fileId: string;
  fileName: string;
  eventId: string;
  eventSummary: string;
  eventStart: string;
  meetInstanceKey: string;
}

const INTERVAL_MS = 2000; // ユーザー間インターバル
const FILE_INTERVAL_MS = 500; // ファイル間インターバル

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discoverTargetsForUser(
  user: WorkspaceUser,
  processedKeys: Set<string>,
  config: ReturnType<typeof getConfig>,
): Promise<OrgScanTarget[]> {
  const targets: OrgScanTarget[] = [];

  // 1. ユーザーの Drive を走査
  const files = await searchUserDriveForTranscripts(user.email);
  if (files.length === 0) return targets;

  console.log(`   📄 ${user.email}: ${files.length} 件の文字起こしドキュメント検出`);

  // 2. ユーザーのカレンダーイベント取得
  const events = await googleCalendar.getEvents(
    user.email,
    config.calendarLookbackDays,
    user.email,
  );

  // 3. 各ドキュメントからeidを抽出してマッチング
  for (const file of files) {
    try {
      const doc = await googleDocs.getDocument(file.id, user.email);
      const extracted = extractTranscript(doc);

      if (!extracted.eid) continue;

      let matched;
      try {
        matched = matchEvent(events, extracted.eid);
      } catch {
        continue; // カレンダーに該当イベントなし
      }

      if (processedKeys.has(matched.meetInstanceKey)) continue;

      const ev = events.find((e) => e.id === matched.eventId);
      targets.push({
        userEmail: user.email,
        fileId: file.id,
        fileName: file.name,
        eventId: matched.eventId,
        eventSummary: ev?.summary ?? "",
        eventStart: ev?.start?.dateTime ?? ev?.start?.date ?? "",
        meetInstanceKey: matched.meetInstanceKey,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("TRANSCRIPT_NOT_FOUND")) {
        logger.warn("Skipping file in orgwide scan", {
          user: user.email,
          file: file.name,
          error: msg,
        });
      }
    }

    await sleep(FILE_INTERVAL_MS);
  }

  return targets;
}

async function processSingle(target: OrgScanTarget): Promise<"success" | "failed"> {
  try {
    // 1. Docs取得 + Transcript抽出
    const doc = await googleDocs.getDocument(target.fileId, target.userEmail);
    const extracted = extractTranscript(doc);

    // 2. Calendar詳細取得（そのユーザーのカレンダーから）
    const eventDetail = await googleCalendar.getEvent(
      target.userEmail,
      target.eventId,
      target.userEmail,
    );

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
    logger.error("Orgwide scan processing failed", {
      meetInstanceKey: target.meetInstanceKey,
      user: target.userEmail,
      error: msg,
    });
    return "failed";
  }
}

// ──────────────────────────────────────
// メイン
// ──────────────────────────────────────

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(isDryRun ? "🔍 全社スキャン (DRY RUN)" : "🚀 全社スキャン (本実行)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  if (!isServiceAccountMode()) {
    console.error("❌ 全社スキャンにはサービスアカウント認証が必要です。");
    console.error("   GOOGLE_SA_CREDENTIALS を設定してください。");
    process.exit(1);
  }

  const config = getConfig();

  // 1. ドメインユーザー取得
  console.log("\n👥 ドメインユーザーを取得中...");
  const users = await listDomainUsers();
  console.log(`   → ${users.length} 名のアクティブユーザー\n`);

  // 2. 処理済み meetInstanceKey を取得
  console.log("📦 処理済み会議を確認中...");
  const sb = createClient(config.supabaseUrl, config.supabaseServiceKey);
  const { data: existingRows } = await sb
    .from("eval_meeting_raw")
    .select("meet_instance_key");
  const processedKeys = new Set(
    (existingRows ?? []).map((r: { meet_instance_key: string }) => r.meet_instance_key),
  );
  console.log(`   → ${processedKeys.size} 件が処理済み\n`);

  // 3. 各ユーザーの Drive を走査
  console.log("🔍 各ユーザーの Drive を走査中...\n");
  const allTargets: OrgScanTarget[] = [];

  for (const user of users) {
    try {
      const targets = await discoverTargetsForUser(user, processedKeys, config);
      allTargets.push(...targets);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`   ⚠️ ${user.email}: スキップ — ${msg}`);
    }
    await sleep(INTERVAL_MS);
  }

  if (allTargets.length === 0) {
    console.log("\n✅ 処理対象が見つかりませんでした。終了します。");
    process.exit(0);
  }

  // 重複排除（同じ meetInstanceKey が複数ユーザーから検出される可能性）
  const uniqueTargets = Array.from(
    new Map(allTargets.map((t) => [t.meetInstanceKey, t])).values(),
  );

  // 対象一覧表示
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 検出結果: ${uniqueTargets.length} 件（重複排除後）`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (let i = 0; i < uniqueTargets.length; i++) {
    const t = uniqueTargets[i]!;
    console.log(`  ${i + 1}. ${t.eventStart}  ${t.eventSummary}`);
    console.log(`     User: ${t.userEmail}`);
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

  for (let i = 0; i < uniqueTargets.length; i++) {
    const target = uniqueTargets[i]!;
    const progress = `[${i + 1}/${uniqueTargets.length}]`;

    console.log(`${progress} 処理中: ${target.eventSummary} (${target.eventStart}) — ${target.userEmail}`);

    const result = await processSingle(target);

    if (result === "success") {
      successCount++;
      console.log(`${progress} ✅ 成功 → ${target.meetInstanceKey}`);
    } else {
      failCount++;
      console.log(`${progress} ❌ 失敗 → ${target.meetInstanceKey}`);
    }

    if (i < uniqueTargets.length - 1) {
      console.log(`   ⏳ ${INTERVAL_MS / 1000}秒待機...\n`);
      await sleep(INTERVAL_MS);
    }
  }

  // 結果サマリー
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 処理完了`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  合計: ${uniqueTargets.length} 件`);
  console.log(`  成功: ${successCount} 件`);
  console.log(`  失敗: ${failCount} 件`);
  console.log("");

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

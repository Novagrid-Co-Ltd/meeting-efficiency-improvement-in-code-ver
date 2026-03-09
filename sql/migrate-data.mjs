/**
 * データ移行スクリプト: 旧Supabase → 新Supabase
 *
 * 使い方:
 *   node sql/migrate-data.mjs              # ドライラン（件数確認のみ）
 *   node sql/migrate-data.mjs --execute    # 本実行
 */

const OLD_URL = "https://vswrfihgqthkjmqwqezb.supabase.co";
const OLD_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd3JmaWhncXRoa2ptcXdxZXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjE2NzQ4MywiZXhwIjoyMDg3NzQzNDgzfQ.oUlqb-USM2YYZkhjeJcawM15FUtYsAf6u2rTbzq8z4w";

const NEW_URL = "https://mfdwbjokkxosagmdzqko.supabase.co";
const NEW_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZHdiam9ra3hvc2FnbWR6cWtvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQyMDcwNCwiZXhwIjoyMDg3OTk2NzA0fQ.mBG62XJXX4O6FLLjlAIWYNbO55J9Bg-YNT2zRtmaIWw";

// FK依存順でテーブルを並べる（親テーブルが先）
const TABLES = [
  "master_person_identity",
  "row_meeting_raw",
  "tf_meeting_attendee",
  "tf_individual_score_input",
  "out_meeting_eval",
  "out_individual_eval",
  "projects",
  "project_members",
  "phases",
  "milestones",
  "project_meetings",
  "extracted_items",
];

const dryRun = !process.argv.includes("--execute");

async function fetchAll(baseUrl, key, table) {
  const rows = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `${baseUrl}/rest/v1/${table}?select=*&offset=${offset}&limit=${limit}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      throw new Error(`Fetch ${table} failed: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    rows.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return rows;
}

async function insertBatch(baseUrl, key, table, rows) {
  // Supabase REST API: POST with upsert
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Insert ${table} batch ${i} failed: ${res.status} ${errText}`);
    }
    inserted += batch.length;
  }
  return inserted;
}

async function main() {
  console.log(dryRun ? "=== ドライラン ===" : "=== 本実行 ===");
  console.log("");

  for (const table of TABLES) {
    try {
      const rows = await fetchAll(OLD_URL, OLD_KEY, table);
      console.log(`${table}: ${rows.length} 件`);

      if (!dryRun && rows.length > 0) {
        const count = await insertBatch(NEW_URL, NEW_KEY, table, rows);
        console.log(`  → ${count} 件 挿入完了`);
      }
    } catch (e) {
      console.error(`${table}: ERROR - ${e.message}`);
    }
  }

  console.log("");
  console.log(dryRun ? "ドライラン完了。本実行は: node sql/migrate-data.mjs --execute" : "移行完了！");
}

main().catch(console.error);

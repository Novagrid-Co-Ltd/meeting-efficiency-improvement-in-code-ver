import http from "node:http";
import { URL } from "node:url";
import "dotenv/config";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 3000;
const redirectUri = `http://127.0.0.1:${PORT}`;
const scopes = "https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/calendar.readonly";

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent`;

console.log("\n=== Google OAuth2 Refresh Token 取得ツール ===\n");
console.log("ブラウザが自動で開きます。開かない場合は以下のURLを手動で開いてください:\n");
console.log(authUrl);
console.log("\n認証後、自動的にトークンを取得します...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);

  // favicon等を無視
  if (url.pathname !== "/") {
    res.writeHead(204);
    res.end();
    return;
  }

  const code = url.searchParams.get("code");

  if (!code) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>エラー: authorization code がありません</h1>");
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const data = await tokenRes.json();

    if (data.refresh_token) {
      console.log("\n✅ Refresh Token 取得成功!\n");
      console.log(`GOOGLE_REFRESH_TOKEN=${data.refresh_token}\n`);
      console.log(".env に上記の値を設定してください。");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>✅ 成功！トークンを取得しました。ターミナルを確認してください。このタブは閉じてOKです。</h1>");
    } else {
      console.log("\n❌ トークン取得エラー:", JSON.stringify(data, null, 2));
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h1>エラー</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    }
  } catch (err) {
    console.error("Token exchange error:", err);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>サーバーエラー</h1>");
  }

  setTimeout(() => { server.close(); process.exit(0); }, 1000);
});

server.listen(PORT, "127.0.0.1", async () => {
  console.log(`Callback サーバー起動: ${redirectUri}`);
  // ブラウザを自動で開く（openがなければ手動で開いてもらう）
  try {
    const { exec } = await import("node:child_process");
    exec(`start "" "${authUrl}"`);
  } catch {
    console.log("ブラウザを手動で開いてください。");
  }
});

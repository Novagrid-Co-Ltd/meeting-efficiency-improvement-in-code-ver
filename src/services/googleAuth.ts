/**
 * 認証一元化モジュール
 *
 * 2つの認証モード:
 * 1. SA mode: GOOGLE_SA_CREDENTIALS が設定 → GoogleAuth + subject (impersonation)
 * 2. Legacy mode: GOOGLE_CLIENT_ID + REFRESH_TOKEN → 従来の OAuth2Client
 */

import { GoogleAuth, OAuth2Client } from "google-auth-library";
import type { AuthClient } from "google-auth-library";
import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
];

/** subjectEmail → AuthClient のキャッシュ */
const clientCache = new Map<string, AuthClient>();

/** Legacy OAuth2Client キャッシュ */
let legacyClient: OAuth2Client | null = null;

/**
 * SA モードかどうかを判定
 */
export function isServiceAccountMode(): boolean {
  const cfg = getConfig();
  return !!cfg.googleSaCredentials;
}

/**
 * 認証クライアントを取得
 *
 * SA mode: subjectEmail に impersonate 対象のメールを指定
 * Legacy mode: subjectEmail は無視され、従来の OAuth2Client を返す
 */
export async function getAuthClient(subjectEmail?: string): Promise<AuthClient> {
  if (!isServiceAccountMode()) {
    return getLegacyClient();
  }
  return getSaClient(subjectEmail);
}

/**
 * アクセストークン文字列を取得（REST API 直接呼び出し用）
 */
export async function getAccessToken(subjectEmail?: string): Promise<string> {
  const client = await getAuthClient(subjectEmail);
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;
  if (!token) {
    throw new Error("Failed to obtain access token");
  }
  return token;
}

// ──────────────────────────────────────
// SA mode
// ──────────────────────────────────────

function getSaClient(subjectEmail?: string): AuthClient {
  const cfg = getConfig();
  const subject = subjectEmail ?? cfg.googleImpersonateEmail;
  const cacheKey = subject || "__default__";

  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const credentials = JSON.parse(cfg.googleSaCredentials!) as {
    client_email: string;
    private_key: string;
    [key: string]: unknown;
  };

  logger.info("Creating SA auth client", { subject: subject || "(none)" });

  const auth = new GoogleAuth({
    credentials,
    scopes: SCOPES,
    clientOptions: subject ? { subject } : undefined,
  });

  // GoogleAuth itself implements AuthClient-compatible getAccessToken
  // We store the GoogleAuth instance as the client
  const client = auth as unknown as AuthClient;
  clientCache.set(cacheKey, client);
  return client;
}

// ──────────────────────────────────────
// Legacy OAuth mode
// ──────────────────────────────────────

function getLegacyClient(): OAuth2Client {
  if (legacyClient) return legacyClient;

  const cfg = getConfig();
  if (!cfg.googleClientId || !cfg.googleClientSecret || !cfg.googleRefreshToken) {
    throw new Error(
      "Neither SA credentials nor OAuth credentials are configured. " +
      "Set GOOGLE_SA_CREDENTIALS or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN.",
    );
  }

  legacyClient = new OAuth2Client(cfg.googleClientId, cfg.googleClientSecret);
  legacyClient.setCredentials({ refresh_token: cfg.googleRefreshToken });
  return legacyClient;
}

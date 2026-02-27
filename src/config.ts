import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export interface Config {
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;
  geminiApiKey: string;
  openaiApiKey: string;
  llmProvider: "gemini" | "openai";
  supabaseUrl: string;
  supabaseServiceKey: string;
  apiKey: string;
  calendarId: string;
  driveFolderId: string;
  adminEmail: string;
  calendarLookbackDays: number;
  quickchartBaseUrl: string;
  port: number;
}

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = {
      googleClientId: requireEnv("GOOGLE_CLIENT_ID"),
      googleClientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      googleRefreshToken: requireEnv("GOOGLE_REFRESH_TOKEN"),
      geminiApiKey: process.env["GEMINI_API_KEY"] || "",
      openaiApiKey: process.env["OPENAI_API_KEY"] || "",
      llmProvider: (optionalEnv("LLM_PROVIDER", "gemini") as "gemini" | "openai"),
      supabaseUrl: requireEnv("SUPABASE_URL"),
      supabaseServiceKey: requireEnv("SUPABASE_SERVICE_KEY"),
      apiKey: requireEnv("API_KEY"),
      calendarId: optionalEnv("CALENDAR_ID", "ren.fujioka@novagrid.tech"),
      driveFolderId: process.env["DRIVE_FOLDER_ID"] || "",
      adminEmail: process.env["ADMIN_EMAIL"] || "",
      calendarLookbackDays: parseInt(optionalEnv("CALENDAR_LOOKBACK_DAYS", "14"), 10),
      quickchartBaseUrl: optionalEnv("QUICKCHART_BASE_URL", "https://quickchart.io"),
      port: parseInt(optionalEnv("PORT", "8080"), 10),
    };
  }
  return _config;
}

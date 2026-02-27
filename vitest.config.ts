import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GOOGLE_REFRESH_TOKEN: "test-refresh-token",
      GEMINI_API_KEY: "test-key",
      OPENAI_API_KEY: "test-key",
      LLM_PROVIDER: "gemini",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_KEY: "test-service-key",
      API_KEY: "test-api-key",
    },
  },
});

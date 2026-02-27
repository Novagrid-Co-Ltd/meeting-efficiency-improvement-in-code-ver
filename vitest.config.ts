import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account","project_id":"test"}',
      GEMINI_API_KEY: "test-key",
      SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_KEY: "test-service-key",
      API_KEY: "test-api-key",
    },
  },
});

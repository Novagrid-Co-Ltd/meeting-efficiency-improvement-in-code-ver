import { describe, it, expect } from "vitest";
import { normalizeEmail } from "../../src/utils/emailNormalizer.js";

describe("normalizeEmail", () => {
  it("converts to lowercase", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  it("replaces @novagrid.co.jp with @novagrid.tech", () => {
    expect(normalizeEmail("tanaka@novagrid.co.jp")).toBe("tanaka@novagrid.tech");
  });

  it("replaces @novagrid.co.jp case-insensitively", () => {
    expect(normalizeEmail("Tanaka@Novagrid.CO.JP")).toBe("tanaka@novagrid.tech");
  });

  it("does not modify @novagrid.tech emails", () => {
    expect(normalizeEmail("tanaka@novagrid.tech")).toBe("tanaka@novagrid.tech");
  });

  it("does not modify other domains", () => {
    expect(normalizeEmail("user@gmail.com")).toBe("user@gmail.com");
  });

  it("handles empty-ish email gracefully", () => {
    expect(normalizeEmail("")).toBe("");
  });
});

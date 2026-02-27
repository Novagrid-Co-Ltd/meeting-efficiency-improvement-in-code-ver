import { describe, it, expect } from "vitest";
import { extractTranscript } from "../../src/logic/extractTranscript.js";
import sampleDoc from "../fixtures/sampleDocsResponse.json";

describe("extractTranscript", () => {
  it("extracts transcript text from 文字起こし tab", () => {
    const result = extractTranscript(sampleDoc);
    expect(result.transcript).toContain("田中: おはようございます");
    expect(result.transcript).toContain("佐藤: はい、まずプロジェクトの進捗");
    expect(result.transcript).toContain("テストがまだ完了していません");
  });

  it("extracts eid from richLink", () => {
    const result = extractTranscript(sampleDoc);
    expect(result.eid).toBe("abc123xyz");
  });

  it("returns correct documentId", () => {
    const result = extractTranscript(sampleDoc);
    expect(result.documentId).toBe("doc-123");
  });

  it("returns correct tab metadata", () => {
    const result = extractTranscript(sampleDoc);
    expect(result.transcriptTabId).toBe("tab-transcript");
    expect(result.transcriptTitle).toBe("文字起こし");
  });

  it("calculates charCount", () => {
    const result = extractTranscript(sampleDoc);
    expect(result.charCount).toBeGreaterThan(0);
    expect(result.charCount).toBe(result.transcript.length);
  });

  it("throws TRANSCRIPT_NOT_FOUND when no transcript tab exists", () => {
    const docWithoutTranscript = {
      documentId: "doc-999",
      title: "No Transcript",
      tabs: [
        {
          tabProperties: { tabId: "tab-1", title: "Notes" },
          documentTab: { body: { content: [] } },
        },
      ],
    };

    expect(() => extractTranscript(docWithoutTranscript)).toThrow("No transcript tab found in document");
  });

  it("finds transcript tab case-insensitively (Transcript)", () => {
    const doc = {
      documentId: "doc-en",
      title: "English doc",
      tabs: [
        {
          tabProperties: { tabId: "tab-t", title: "Transcript" },
          documentTab: {
            body: {
              content: [
                { paragraph: { elements: [{ textRun: { content: "Hello" } }] } },
              ],
            },
          },
        },
      ],
    };
    const result = extractTranscript(doc);
    expect(result.transcript).toBe("Hello");
  });
});

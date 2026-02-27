import { describe, it, expect } from "vitest";
import { sanitizeAndParseJson } from "../../src/utils/jsonSanitizer.js";

describe("sanitizeAndParseJson", () => {
  it("parses valid JSON directly", () => {
    const result = sanitizeAndParseJson('{"key": "value"}');
    expect(result).toEqual({ key: "value" });
  });

  it("strips ```json code fences", () => {
    const input = '```json\n{"score": 5}\n```';
    expect(sanitizeAndParseJson(input)).toEqual({ score: 5 });
  });

  it("strips ``` code fences without json label", () => {
    const input = '```\n{"score": 5}\n```';
    expect(sanitizeAndParseJson(input)).toEqual({ score: 5 });
  });

  it("extracts JSON from surrounding text", () => {
    const input = 'Here is the result: {"score": 5} hope this helps!';
    expect(sanitizeAndParseJson(input)).toEqual({ score: 5 });
  });

  it("returns null for completely invalid input", () => {
    expect(sanitizeAndParseJson("not json at all")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeAndParseJson("")).toBeNull();
  });

  it("handles nested JSON objects", () => {
    const input = '```json\n{"a": {"b": [1, 2, 3]}}\n```';
    expect(sanitizeAndParseJson(input)).toEqual({ a: { b: [1, 2, 3] } });
  });

  it("handles JSON with extra whitespace in fences", () => {
    const input = '```json  \n  {"key": "value"}  \n  ```';
    expect(sanitizeAndParseJson(input)).toEqual({ key: "value" });
  });
});

import { getConfig } from "../config.js";
import { sanitizeAndParseJson } from "../utils/jsonSanitizer.js";
import { logger } from "../utils/logger.js";

function getGeminiUrl(): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${getConfig().geminiApiKey}`;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

async function callGemini(prompt: string): Promise<string> {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const res = await fetch(getGeminiUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errorText}`);
  }

  const data = (await res.json()) as GeminiApiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}

export async function generateAndParse<T>(prompt: string): Promise<{ parsed: T | null; raw: string }> {
  logger.info("Calling Gemini API");
  const raw = await callGemini(prompt);
  const parsed = sanitizeAndParseJson<T>(raw);

  if (parsed !== null) {
    return { parsed, raw };
  }

  // Retry once on parse failure
  logger.warn("Gemini JSON parse failed, retrying once");
  const retryRaw = await callGemini(prompt);
  const retryParsed = sanitizeAndParseJson<T>(retryRaw);

  return { parsed: retryParsed, raw: retryRaw };
}

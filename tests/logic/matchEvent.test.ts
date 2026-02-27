import { describe, it, expect } from "vitest";
import { matchEvent } from "../../src/logic/matchEvent.js";
import sampleEvents from "../fixtures/sampleCalendarEvents.json";

describe("matchEvent", () => {
  it("matches event by eid", () => {
    const result = matchEvent(sampleEvents, "abc123xyz");
    expect(result.eventId).toBe("event-001");
  });

  it("builds correct meetInstanceKey", () => {
    const result = matchEvent(sampleEvents, "abc123xyz");
    expect(result.meetInstanceKey).toBe("event-001__2026-02-20T10:00:00+09:00");
  });

  it("matches a different event", () => {
    const result = matchEvent(sampleEvents, "other456");
    expect(result.eventId).toBe("event-002");
  });

  it("throws EVENT_NOT_MATCHED for unknown eid", () => {
    expect(() => matchEvent(sampleEvents, "nonexistent")).toThrow("No calendar event found");
  });

  it("throws EVENT_NOT_MATCHED for empty eid", () => {
    expect(() => matchEvent(sampleEvents, "")).toThrow("No calendar event found");
  });
});

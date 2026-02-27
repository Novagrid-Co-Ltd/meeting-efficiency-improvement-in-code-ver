import { describe, it, expect } from "vitest";
import { buildAttendees } from "../../src/logic/buildAttendees.js";
import type { MasterPersonIdentity } from "../../src/types/meeting.js";

const calendarAttendees = [
  { email: "tanaka@novagrid.tech", displayName: "Tanaka", responseStatus: "accepted", organizer: true },
  { email: "sato@novagrid.co.jp", displayName: "Sato", responseStatus: "accepted" },
  { email: "guest@external.com", displayName: "Guest", responseStatus: "declined" },
];

const personIdentities: MasterPersonIdentity[] = [
  { id: "pid-001", email: "tanaka@novagrid.tech", display_name: "田中太郎" },
  { id: "pid-002", email: "sato@novagrid.tech", display_name: "佐藤花子" },
];

describe("buildAttendees", () => {
  it("resolves known emails with email_exact", () => {
    const result = buildAttendees(calendarAttendees, personIdentities);
    const tanaka = result.find((a) => a.email === "tanaka@novagrid.tech");
    expect(tanaka?.resolve_method).toBe("email_exact");
    expect(tanaka?.confidence).toBe(1);
    expect(tanaka?.person_id).toBe("pid-001");
    expect(tanaka?.display_name).toBe("田中太郎");
  });

  it("normalizes co.jp to tech and resolves", () => {
    const result = buildAttendees(calendarAttendees, personIdentities);
    const sato = result.find((a) => a.email === "sato@novagrid.tech");
    expect(sato?.resolve_method).toBe("email_exact");
    expect(sato?.person_id).toBe("pid-002");
  });

  it("marks unknown emails as unresolved", () => {
    const result = buildAttendees(calendarAttendees, personIdentities);
    const guest = result.find((a) => a.email === "guest@external.com");
    expect(guest?.resolve_method).toBe("unresolved");
    expect(guest?.confidence).toBe(0);
    expect(guest?.person_id).toBeNull();
  });

  it("includes declined attendees", () => {
    const result = buildAttendees(calendarAttendees, personIdentities);
    const declined = result.find((a) => a.response_status === "declined");
    expect(declined).toBeDefined();
    expect(declined?.email).toBe("guest@external.com");
  });

  it("preserves organizer flag", () => {
    const result = buildAttendees(calendarAttendees, personIdentities);
    const organizer = result.find((a) => a.is_organizer);
    expect(organizer?.email).toBe("tanaka@novagrid.tech");
  });

  it("returns all attendees", () => {
    const result = buildAttendees(calendarAttendees, personIdentities);
    expect(result).toHaveLength(3);
  });
});

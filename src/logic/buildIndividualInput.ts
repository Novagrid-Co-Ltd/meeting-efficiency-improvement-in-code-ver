import type { RowMeetingRaw, TfMeetingAttendee, TfIndividualScoreInput } from "../types/meeting.js";

export function buildIndividualInputs(
  rowData: RowMeetingRaw,
  attendees: TfMeetingAttendee[],
): TfIndividualScoreInput[] {
  return attendees.map((attendee) => ({
    meet_instance_key: rowData.meet_instance_key,
    email: attendee.email,
    display_name: attendee.display_name,
    transcript: rowData.transcript,
    event_summary: rowData.event_summary,
    event_start: rowData.event_start,
    event_end: rowData.event_end,
    attendee_count: rowData.attendee_count,
  }));
}

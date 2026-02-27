import type { TfMeetingAttendee } from "./meeting.js";
import type { OutMeetingEval, OutIndividualEval } from "./evaluation.js";

export interface ProcessMeetingRequest {
  fileId: string;
}

export interface MeetingReport {
  to: string[];
  subject: string;
  html: string;
  text: string;
  chartUrl: string;
}

export interface IndividualReport {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface ProcessMeetingResponse {
  ok: true;
  meetInstanceKey: string;
  attendees: TfMeetingAttendee[];
  meetingReport: MeetingReport;
  individualReports: IndividualReport[];
}

export interface ErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    step: string;
  };
  notification?: {
    to: string;
    subject: string;
    text: string;
  };
}

export class AppError extends Error {
  public readonly code: string;
  public readonly step: string;
  public readonly statusCode: number;

  constructor(params: { code: string; message: string; step: string; statusCode?: number }) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.step = params.step;
    this.statusCode = params.statusCode ?? 500;
  }
}

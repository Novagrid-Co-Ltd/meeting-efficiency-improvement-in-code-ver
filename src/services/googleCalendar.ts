import { OAuth2Client } from "google-auth-library";
import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";

let oauth2Client: OAuth2Client | null = null;

function getOAuth2Client(): OAuth2Client {
  if (!oauth2Client) {
    const cfg = getConfig();
    oauth2Client = new OAuth2Client(cfg.googleClientId, cfg.googleClientSecret);
    oauth2Client.setCredentials({ refresh_token: cfg.googleRefreshToken });
  }
  return oauth2Client;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  htmlLink?: string;
  organizer?: { email: string };
  attendees?: CalendarAttendee[];
}

export interface CalendarAttendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
  organizer?: boolean;
}

interface EventListResponse {
  items?: CalendarEvent[];
}

export async function getEvents(calendarId: string, lookbackDays: number): Promise<CalendarEvent[]> {
  const client = getOAuth2Client();
  const now = new Date();
  const timeMin = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: now.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`;
  logger.info("Fetching calendar events", { calendarId, lookbackDays });

  const res = await client.request<EventListResponse>({ url });
  return res.data.items ?? [];
}

export async function getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
  const client = getOAuth2Client();
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  logger.info("Fetching single calendar event", { calendarId, eventId });

  const res = await client.request<CalendarEvent>({ url });
  return res.data;
}

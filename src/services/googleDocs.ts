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

export interface DocsDocument {
  documentId: string;
  title: string;
  tabs?: DocsTab[];
}

export interface DocsTab {
  tabProperties?: { tabId: string; title: string };
  documentTab?: {
    body?: {
      content?: DocsContentElement[];
    };
  };
}

export interface DocsContentElement {
  paragraph?: {
    elements?: Array<{
      textRun?: { content: string };
      richLink?: { richLinkProperties?: { uri: string } };
    }>;
  };
}

export async function getDocument(documentId: string): Promise<DocsDocument> {
  const client = getOAuth2Client();
  const url = `https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`;
  logger.info("Fetching Google Doc", { documentId });

  const res = await client.request<DocsDocument>({ url });
  return res.data;
}

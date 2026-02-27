import { GoogleAuth } from "google-auth-library";
import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";

let auth: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!auth) {
    const credentials = JSON.parse(getConfig().googleServiceAccountJson);
    auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/documents.readonly"],
    });
  }
  return auth;
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
  const client = await getAuth().getClient();
  const url = `https://docs.googleapis.com/v1/documents/${documentId}?includeTabsContent=true`;
  logger.info("Fetching Google Doc", { documentId });

  const res = await client.request<DocsDocument>({ url });
  return res.data;
}

/**
 * Admin SDK Directory API: ドメイン内ユーザー一覧取得
 */

import { getConfig } from "../config.js";
import { getAuthClient } from "./googleAuth.js";
import { logger } from "../utils/logger.js";

export interface WorkspaceUser {
  email: string;
  fullName: string;
  suspended: boolean;
  archived: boolean;
}

interface DirectoryUser {
  primaryEmail: string;
  name?: { fullName?: string };
  suspended?: boolean;
  archived?: boolean;
}

interface DirectoryListResponse {
  users?: DirectoryUser[];
  nextPageToken?: string;
}

/**
 * ドメイン内のアクティブユーザー一覧を取得
 * Admin SDK Directory API を使用（管理者ユーザーで委任）
 */
export async function listDomainUsers(domain?: string): Promise<WorkspaceUser[]> {
  const cfg = getConfig();
  const targetDomain = domain ?? cfg.workspaceDomain;
  if (!targetDomain) {
    throw new Error("WORKSPACE_DOMAIN is not configured");
  }

  // Admin API は管理者ユーザーで委任する必要がある
  const client = await getAuthClient(cfg.googleImpersonateEmail);
  const allUsers: WorkspaceUser[] = [];
  let pageToken: string | undefined;

  logger.info("Fetching domain users", { domain: targetDomain });

  do {
    const params = new URLSearchParams({
      domain: targetDomain,
      maxResults: "200",
      orderBy: "email",
      projection: "basic",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const url = `https://admin.googleapis.com/admin/directory/v1/users?${params}`;
    const res = await client.request<DirectoryListResponse>({ url });

    if (res.data.users) {
      for (const u of res.data.users) {
        const user: WorkspaceUser = {
          email: u.primaryEmail,
          fullName: u.name?.fullName ?? u.primaryEmail,
          suspended: u.suspended ?? false,
          archived: u.archived ?? false,
        };
        // suspended / archived を除外
        if (!user.suspended && !user.archived) {
          allUsers.push(user);
        }
      }
    }
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  logger.info("Domain users fetched", { count: allUsers.length });
  return allUsers;
}

export type BugReport = {
  id: string;
  reporterId: string;
  reporterName: string;
  title: string;
  description: string;
  pageUrl: string;
  status: "open" | "fixed" | "rejected";
  createdAt: string;
  adminReadAt: string | null;
  fixedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  rewardedAt: string | null;
};

export type SiteNotification = {
  id: string;
  userId: string;
  type: "bug-fixed" | "bug-rejected";
  title: string;
  message: string;
  bugId: string;
  xpAwarded: number;
  createdAt: string;
  readAt: string | null;
};

export type BugCooldown = {
  remainingSeconds: number;
  nextAllowedAt: string | null;
};

export class BugRequestError extends Error {
  remainingSeconds: number;
  nextAllowedAt: string | null;

  constructor(message: string, remainingSeconds = 0, nextAllowedAt: string | null = null) {
    super(message);
    this.name = "BugRequestError";
    this.remainingSeconds = remainingSeconds;
    this.nextAllowedAt = nextAllowedAt;
  }
}

const requestBugs = async <T,>(path: string, authToken: string, init?: RequestInit) => {
  const response = await fetch(`/.netlify/functions/bugs${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  const result = await response.json().catch(() => ({})) as T & {
    error?: string;
    remainingSeconds?: number;
    nextAllowedAt?: string | null;
  };
  if (!response.ok) {
    throw new BugRequestError(
      result.error ?? "Сервис обращений временно недоступен",
      result.remainingSeconds,
      result.nextAllowedAt,
    );
  }
  return result;
};

export const reportBug = (payload: { reporterId: string; title: string; description: string; pageUrl: string }, authToken: string) =>
  requestBugs<BugReport & { nextAllowedAt: string }>("", authToken, { method: "POST", body: JSON.stringify(payload) });

export const getBugReportCooldown = (userId: string, authToken: string) =>
  requestBugs<BugCooldown>(`?userId=${encodeURIComponent(userId)}&cooldown=1`, authToken);

export const getBugReports = (adminId: string, authToken: string) =>
  requestBugs<BugReport[]>(`?adminId=${encodeURIComponent(adminId)}`, authToken);

export const getUnreadBugCount = (adminId: string, authToken: string) =>
  requestBugs<{ count: number }>(`?adminId=${encodeURIComponent(adminId)}&summary=1`, authToken);

export const markBugReportsRead = (adminId: string, authToken: string) =>
  requestBugs<{ ok: boolean }>("", authToken, { method: "PATCH", body: JSON.stringify({ action: "markRead", adminId }) });

export const markBugFixed = (adminId: string, bugId: string, authToken: string) =>
  requestBugs<{ report: BugReport; rewarded: boolean }>("", authToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "fix", adminId, bugId }),
  });

export const rejectBug = (adminId: string, bugId: string, reason: string, authToken: string) =>
  requestBugs<{ report: BugReport }>("", authToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "reject", adminId, bugId, reason }),
  });

export const getNotifications = (userId: string, authToken: string) =>
  requestBugs<SiteNotification[]>(`?userId=${encodeURIComponent(userId)}`, authToken);

export const getUnreadNotificationCount = (userId: string, authToken: string) =>
  requestBugs<{ count: number }>(`?userId=${encodeURIComponent(userId)}&summary=1`, authToken);

export const markNotificationsRead = (userId: string, authToken: string) =>
  requestBugs<{ ok: boolean }>("", authToken, { method: "PATCH", body: JSON.stringify({ action: "readNotifications", userId }) });

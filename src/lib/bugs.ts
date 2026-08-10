export type FeedbackKind = "bug" | "improvement";

export type FeedbackReport = {
  id: string;
  kind: FeedbackKind;
  reporterId: string;
  reporterName: string;
  title: string;
  description: string;
  pageUrl: string;
  status: "open" | "fixed" | "accepted" | "rejected";
  createdAt: string;
  adminReadAt: string | null;
  fixedAt: string | null;
  acceptedAt?: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  rewardedAt: string | null;
};

export type SiteNotification = {
  id: string;
  userId: string;
  type: "bug-fixed" | "bug-rejected" | "improvement-accepted" | "improvement-rejected" | "review-new" | "review-reply" | "duel-invite" | "duel-accepted" | "duel-declined" | "duel-cancelled" | "duel-opponent-left" | "duel-finished";
  title: string;
  message: string;
  bugId: string;
  xpAwarded: number;
  createdAt: string;
  readAt: string | null;
};

export type FeedbackCooldown = {
  remainingSeconds: number;
  nextAllowedAt: string | null;
};

const feedbackPageNames: Record<string, string> = {
  "/": "Главная",
  "/practice": "Практика и экзамены",
  "/games": "Мини-игры",
  "/duels": "Онлайн-дуэли",
  "/review": "Повторение",
  "/leaderboard": "Рейтинг",
  "/messages": "Сообщения",
  "/notifications": "Уведомления",
  "/whats-new": "Что нового?",
  "/suggest": "Предложения и сообщения о багах",
};

const feedbackSubjectNames: Record<string, string> = {
  "it-design": "ИТ и графика",
  management: "Менеджмент",
  economics: "Экономика",
  english: "Английский язык",
};

export const formatFeedbackPage = (pageUrl: string) => {
  if (!pageUrl) return "Страница не указана";
  try {
    const url = new URL(pageUrl, "https://atlasum.local");
    const pageName = feedbackPageNames[url.pathname] ?? "Страница Атласума";
    const subject = url.searchParams.get("subject");
    return subject && feedbackSubjectNames[subject]
      ? pageName + " · " + feedbackSubjectNames[subject]
      : pageName;
  } catch {
    return "Страница Атласума";
  }
};

export class FeedbackRequestError extends Error {
  remainingSeconds: number;
  nextAllowedAt: string | null;

  constructor(message: string, remainingSeconds = 0, nextAllowedAt: string | null = null) {
    super(message);
    this.name = "FeedbackRequestError";
    this.remainingSeconds = remainingSeconds;
    this.nextAllowedAt = nextAllowedAt;
  }
}

const requestFeedback = async <T,>(path: string, authToken: string, init?: RequestInit) => {
  const response = await fetch(`/.netlify/functions/bugs${path}`, {
    cache: "no-store",
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
    throw new FeedbackRequestError(
      result.error ?? "Сервис предложений временно недоступен",
      result.remainingSeconds,
      result.nextAllowedAt,
    );
  }
  return result;
};

export const submitFeedback = (
  payload: { reporterId: string; kind: FeedbackKind; title: string; description: string; pageUrl: string },
  authToken: string,
) => requestFeedback<FeedbackReport & { nextAllowedAt: string }>("", authToken, {
  method: "POST",
  body: JSON.stringify(payload),
});

export const getFeedbackCooldown = (userId: string, authToken: string) =>
  requestFeedback<FeedbackCooldown>(`?userId=${encodeURIComponent(userId)}&cooldown=1`, authToken);

export const getFeedbackReports = (adminId: string, authToken: string) =>
  requestFeedback<FeedbackReport[]>(`?adminId=${encodeURIComponent(adminId)}`, authToken);

export const getUnreadFeedbackCount = (adminId: string, authToken: string) =>
  requestFeedback<{ count: number }>(`?adminId=${encodeURIComponent(adminId)}&summary=1`, authToken);

export const markFeedbackReportsRead = (adminId: string, authToken: string) =>
  requestFeedback<{ ok: boolean }>("", authToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "markRead", adminId }),
  });

export const acceptFeedback = (adminId: string, reportId: string, authToken: string) =>
  requestFeedback<{ report: FeedbackReport; rewarded: boolean }>("", authToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "accept", adminId, bugId: reportId }),
  });

export const rejectFeedback = (adminId: string, reportId: string, reason: string, authToken: string) =>
  requestFeedback<{ report: FeedbackReport }>("", authToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "reject", adminId, bugId: reportId, reason }),
  });

export const getNotifications = (userId: string, authToken: string) =>
  requestFeedback<SiteNotification[]>(`?userId=${encodeURIComponent(userId)}`, authToken);

export const getUnreadNotificationCount = (userId: string, authToken: string) =>
  requestFeedback<{ count: number }>(`?userId=${encodeURIComponent(userId)}&summary=1`, authToken);

export const markNotificationsRead = (userId: string, authToken: string) =>
  requestFeedback<{ ok: boolean }>("", authToken, {
    method: "PATCH",
    body: JSON.stringify({ action: "readNotifications", userId }),
  });

import { getStore } from "@netlify/blobs";
import { getSessionToken } from "./session-token.mjs";

type FeedbackKind = "bug" | "improvement";

type FeedbackReport = {
  id: string;
  kind?: FeedbackKind;
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

type SiteNotification = {
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

type RewardableLeaderboardEntry = {
  id: string;
  name: string;
  xp: number;
  level: number;
  rewardedBugIds?: string[];
  [key: string]: unknown;
};

type BugSubmissionLimit = {
  reporterId: string;
  lastSubmittedAt: string;
  nextAllowedAt: string;
};

const ADMIN_ID = "lonexnesss";
const BUG_REWARD_XP = 200;
const IMPROVEMENT_REWARD_XP = 300;
const BUG_REPORT_COOLDOWN_MS = 30 * 60 * 1000;
const MAX_LEVEL = 30;
const bugsStore = () => getStore({ name: "design-tests-bugs", consistency: "strong" });
const bugLimitsStore = () => getStore({ name: "design-tests-bug-limits", consistency: "strong" });
const notificationsStore = () => getStore({ name: "design-tests-notifications", consistency: "strong" });
const duelsStore = () => getStore({ name: "design-tests-duels", consistency: "strong" });
const leaderboardStore = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });

const xpRequiredForNextLevel = (level: number) => {
  if (level === 1) return 250;
  if (level === 2) return 500;
  return 800 + (Math.max(3, level) - 3) * 300;
};

const levelFromXp = (xp: number) => {
  const safeXp = Math.max(0, xp);
  let level = 1;
  let requiredXp = 0;
  while (level < MAX_LEVEL) {
    requiredXp += xpRequiredForNextLevel(level);
    if (safeXp < requiredXp) break;
    level += 1;
  }
  return level;
};

const cleanUserId = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getSessionUserId = async (request: Request) => {
  const token = getSessionToken(request);
  if (!token) return "";
  const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as {
    userId?: string;
    expiresAt?: string;
  } | null;
  if (!session?.userId || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return "";
  return cleanUserId(session.userId);
};

const getLeaderboardUser = async (userId: string) => {
  if (!userId) return null;
  return leaderboardStore().get(userId, { type: "json", consistency: "strong" }) as Promise<RewardableLeaderboardEntry | null>;
};

const requireAdmin = async (userId: string) => userId === ADMIN_ID && Boolean(await getLeaderboardUser(userId));
const reportKind = (report: FeedbackReport): FeedbackKind => report.kind === "improvement" ? "improvement" : "bug";
const rewardForReport = (report: FeedbackReport) => reportKind(report) === "improvement" ? IMPROVEMENT_REWARD_XP : BUG_REWARD_XP;

const cooldownState = (limit: BugSubmissionLimit | null) => {
  const nextAllowedAtMs = limit?.nextAllowedAt ? Date.parse(limit.nextAllowedAt) : 0;
  const remainingSeconds = Math.max(0, Math.ceil((nextAllowedAtMs - Date.now()) / 1000));
  return {
    remainingSeconds,
    nextAllowedAt: remainingSeconds > 0 && limit ? limit.nextAllowedAt : null,
  };
};

const getBugCooldown = async (reporterId: string) => {
  const limit = await bugLimitsStore().get(reporterId, { type: "json", consistency: "strong" }) as BugSubmissionLimit | null;
  return cooldownState(limit);
};

const reserveBugSubmission = async (reporterId: string) => {
  const store = bugLimitsStore();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await store.getWithMetadata(reporterId, { type: "json", consistency: "strong" });
    const current = cooldownState((stored?.data as BugSubmissionLimit | null) ?? null);
    if (current.remainingSeconds > 0) return { allowed: false, ...current };

    const now = new Date();
    const limit: BugSubmissionLimit = {
      reporterId,
      lastSubmittedAt: now.toISOString(),
      nextAllowedAt: new Date(now.getTime() + BUG_REPORT_COOLDOWN_MS).toISOString(),
    };
    const result = stored?.etag
      ? await store.setJSON(reporterId, limit, { onlyIfMatch: stored.etag })
      : await store.setJSON(reporterId, limit, { onlyIfNew: true });
    if (result.modified) {
      return { allowed: true, remainingSeconds: Math.ceil(BUG_REPORT_COOLDOWN_MS / 1000), nextAllowedAt: limit.nextAllowedAt };
    }
  }
  throw new Error("Не удалось проверить интервал отправки обращения");
};

const listReports = async () => {
  const store = bugsStore();
  const { blobs } = await store.list();
  const reports = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json", consistency: "strong" })));
  return reports
    .filter((report): report is FeedbackReport => Boolean(report && typeof report === "object"))
    .map((report) => ({ ...report, kind: reportKind(report) }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const listNotifications = async (userId: string) => {
  const store = notificationsStore();
  const { blobs } = await store.list({ prefix: `${userId}/` });
  const notifications = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json", consistency: "strong" })));
  const valid = notifications.filter((notification): notification is SiteNotification => Boolean(notification && typeof notification === "object"));
  const current = await Promise.all(valid.map(async (notification) => {
    if (["duel-accepted", "duel-declined", "duel-cancelled"].includes(notification.type)) {
      await store.delete(`${userId}/${notification.id}`);
      return null;
    }
    if (notification.type !== "duel-invite") return notification;
    const duel = await duelsStore().get(notification.bugId, { type: "json", consistency: "strong" }) as {
      status?: string;
      invitee?: { id?: string };
    } | null;
    if (duel?.status === "pending" && duel.invitee?.id === userId) return notification;
    await store.delete(`${userId}/${notification.id}`);
    return null;
  }));
  return current
    .filter((notification): notification is SiteNotification => Boolean(notification))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 200);
};

const awardReportReward = async (report: FeedbackReport) => {
  const leaderboard = leaderboardStore();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const stored = await leaderboard.getWithMetadata(report.reporterId, { type: "json", consistency: "strong" });
    if (!stored?.etag || !stored.data) throw new Error("Профиль автора обращения не найден");
    const entry = stored.data as RewardableLeaderboardEntry;
    const rewardedBugIds = Array.isArray(entry.rewardedBugIds) ? entry.rewardedBugIds.map(String) : [];
    if (rewardedBugIds.includes(report.id)) return false;

    const xp = Math.max(0, Number(entry.xp) || 0) + rewardForReport(report);
    const updated = {
      ...entry,
      xp,
      level: levelFromXp(xp),
      rewardedBugIds: [...rewardedBugIds, report.id].slice(-1000),
    };
    const result = await leaderboard.setJSON(report.reporterId, updated, { onlyIfMatch: stored.etag });
    if (result.modified) return true;
  }
  throw new Error("Не удалось начислить награду из-за одновременного обновления профиля");
};

const notifyReporter = async (report: FeedbackReport) => {
  const improvement = reportKind(report) === "improvement";
  const notification: SiteNotification = {
    id: `${improvement ? "improvement-accepted" : "bug-fixed"}-${report.id}`,
    userId: report.reporterId,
    type: improvement ? "improvement-accepted" : "bug-fixed",
    title: improvement ? "Ваше улучшение принято" : "Ваш баг исправлен",
    message: improvement
      ? `Предложение «${report.title}» принято. Спасибо за идею для развития проекта!`
      : `Исправлено обращение «${report.title}». Спасибо за помощь проекту!`,
    bugId: report.id,
    xpAwarded: rewardForReport(report),
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  await notificationsStore().setJSON(`${report.reporterId}/${notification.id}`, notification, { onlyIfNew: true });
};

const notifyRejectedReport = async (report: FeedbackReport, reason: string) => {
  const improvement = reportKind(report) === "improvement";
  const notification: SiteNotification = {
    id: `${improvement ? "improvement-rejected" : "bug-rejected"}-${report.id}`,
    userId: report.reporterId,
    type: improvement ? "improvement-rejected" : "bug-rejected",
    title: improvement ? "Предложение не принято" : "Обращение отклонено",
    message: `${improvement ? "Предложение" : "Обращение"} «${report.title}» отклонено. Причина: ${reason}`,
    bugId: report.id,
    xpAwarded: 0,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  await notificationsStore().setJSON(`${report.reporterId}/${notification.id}`, notification, { onlyIfNew: true });
};

export default async (request: Request) => {
  try {
    const url = new URL(request.url);
    const sessionUserId = await getSessionUserId(request);
    if (!sessionUserId) return jsonError("Войдите в аккаунт заново", 401);

    if (request.method === "GET") {
      const userId = cleanUserId(url.searchParams.get("userId"));
      const adminId = cleanUserId(url.searchParams.get("adminId"));
      const summary = url.searchParams.get("summary") === "1";
      const cooldown = url.searchParams.get("cooldown") === "1";

      if (userId) {
        if (sessionUserId !== userId) return jsonError("Нет доступа к чужим уведомлениям", 403);
        if (!await getLeaderboardUser(userId)) return jsonError("Пользователь не найден", 403);
        if (cooldown) return Response.json(await getBugCooldown(userId));
        const notifications = await listNotifications(userId);
        return summary
          ? Response.json({ count: notifications.filter((item) => !item.readAt).length })
          : Response.json(notifications);
      }

      if (sessionUserId !== adminId || !await requireAdmin(adminId)) return jsonError("Доступ разрешён только администратору", 403);
      const reports = await listReports();
      return summary
        ? Response.json({ count: reports.filter((report) => !report.adminReadAt).length })
        : Response.json(reports);
    }

    if (request.method === "POST") {
      const payload = await request.json() as { reporterId?: string; kind?: string; title?: string; description?: string; pageUrl?: string };
      const reporterId = cleanUserId(payload.reporterId);
      const kind: FeedbackKind = payload.kind === "improvement" ? "improvement" : "bug";
      if (sessionUserId !== reporterId) return jsonError("Нельзя отправить обращение от имени другого пользователя", 403);
      if (reporterId === ADMIN_ID) return jsonError("Администратор принимает обращения и не создаёт заявки", 403);
      const reporter = await getLeaderboardUser(reporterId);
      if (!reporter) return jsonError("Войдите в аккаунт перед отправкой обращения", 403);
      const title = String(payload.title ?? "").trim().slice(0, 120);
      const description = String(payload.description ?? "").trim().slice(0, 3000);
      const pageUrl = String(payload.pageUrl ?? "").trim().slice(0, 500);
      if (title.length < 5) return jsonError(kind === "improvement" ? "Кратко назовите улучшение" : "Кратко назовите проблему", 400);
      if (description.length < 15) return jsonError(kind === "improvement" ? "Опишите идею подробнее" : "Опишите проблему подробнее", 400);

      const reservation = await reserveBugSubmission(reporterId);
      if (!reservation.allowed) {
        const minutes = Math.max(1, Math.ceil(reservation.remainingSeconds / 60));
        return Response.json({
          error: `Новую заявку можно отправить через ${minutes} мин.`,
          remainingSeconds: reservation.remainingSeconds,
          nextAllowedAt: reservation.nextAllowedAt,
        }, {
          status: 429,
          headers: { "Retry-After": String(reservation.remainingSeconds) },
        });
      }

      const report: FeedbackReport = {
        id: crypto.randomUUID(),
        kind,
        reporterId,
        reporterName: String(reporter.name ?? reporterId).slice(0, 40),
        title,
        description,
        pageUrl,
        status: "open",
        createdAt: new Date().toISOString(),
        adminReadAt: null,
        fixedAt: null,
        acceptedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        rewardedAt: null,
      };
      await bugsStore().setJSON(report.id, report, { onlyIfNew: true });
      return Response.json({ ...report, nextAllowedAt: reservation.nextAllowedAt }, { status: 201 });
    }

    if (request.method === "PATCH") {
      const payload = await request.json() as { action?: string; adminId?: string; userId?: string; bugId?: string; reason?: string };
      if (payload.action === "readNotifications") {
        const userId = cleanUserId(payload.userId);
        if (sessionUserId !== userId) return jsonError("Нет доступа к чужим уведомлениям", 403);
        if (!await getLeaderboardUser(userId)) return jsonError("Пользователь не найден", 403);
        const notifications = await listNotifications(userId);
        const readAt = new Date().toISOString();
        await Promise.all(notifications.filter((item) => !item.readAt && item.type !== "duel-invite").map((item) =>
          notificationsStore().setJSON(`${userId}/${item.id}`, { ...item, readAt })));
        return Response.json({ ok: true });
      }

      const adminId = cleanUserId(payload.adminId);
      if (sessionUserId !== adminId || !await requireAdmin(adminId)) return jsonError("Доступ разрешён только администратору", 403);

      if (payload.action === "markRead") {
        const reports = await listReports();
        const adminReadAt = new Date().toISOString();
        await Promise.all(reports.filter((report) => !report.adminReadAt).map((report) =>
          bugsStore().setJSON(report.id, { ...report, adminReadAt })));
        return Response.json({ ok: true });
      }

      if (payload.action === "fix" || payload.action === "accept") {
        const bugId = String(payload.bugId ?? "").trim();
        const report = await bugsStore().get(bugId, { type: "json", consistency: "strong" }) as FeedbackReport | null;
        if (!report) return jsonError("Обращение не найдено", 404);
        if (report.status !== "open") return jsonError("Обращение уже обработано", 409);

        const rewarded = await awardReportReward(report);
        await notifyReporter(report);
        const now = new Date().toISOString();
        const improvement = reportKind(report) === "improvement";
        const fixedReport: FeedbackReport = {
          ...report,
          kind: reportKind(report),
          status: improvement ? "accepted" : "fixed",
          adminReadAt: report.adminReadAt ?? now,
          fixedAt: improvement ? null : now,
          acceptedAt: improvement ? now : null,
          rewardedAt: now,
        };
        await bugsStore().setJSON(report.id, fixedReport);
        return Response.json({ report: fixedReport, rewarded });
      }

      if (payload.action === "reject") {
        const bugId = String(payload.bugId ?? "").trim();
        const report = await bugsStore().get(bugId, { type: "json", consistency: "strong" }) as FeedbackReport | null;
        if (!report) return jsonError("Обращение не найдено", 404);
        if (report.status !== "open") return jsonError("Обращение уже обработано", 409);
        const reason = String(payload.reason ?? "").trim().slice(0, 300)
          || (reportKind(report) === "improvement" ? "Предложение не подходит проекту" : "Проблема не подтверждена");
        const now = new Date().toISOString();
        const rejectedReport: FeedbackReport = {
          ...report,
          kind: reportKind(report),
          status: "rejected",
          adminReadAt: report.adminReadAt ?? now,
          rejectedAt: now,
          rejectionReason: reason,
        };
        await notifyRejectedReport(rejectedReport, reason);
        await bugsStore().setJSON(report.id, rejectedReport);
        return Response.json({ report: rejectedReport });
      }

      return jsonError("Неизвестная операция", 400);
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, PATCH" } });
  } catch (error) {
    console.error("Bugs function failed", error);
    return jsonError("Не удалось обработать обращение", 500);
  }
};

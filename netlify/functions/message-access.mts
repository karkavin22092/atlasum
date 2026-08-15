import { getStore } from "@netlify/blobs";
import { accessKey, cleanAccessUserId, loadAccess, makeAccess, saveAccess, type MessageAccessRecord } from "./message-access-core.mjs";
import { getSessionToken } from "./session-token.mjs";

type LeaderboardUser = { id: string; name?: string };
type MessageNotification = {
  id: string;
  userId: string;
  type: "message-request" | "message-request-accepted" | "message-request-declined";
  title: string;
  message: string;
  bugId: string;
  xpAwarded: number;
  createdAt: string;
  readAt: string | null;
};

const leaderboardStore = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });
const notificationsStore = () => getStore({ name: "design-tests-notifications", consistency: "strong" });
const ADMIN_ID = "lonexnesss";
const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });
const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const sessionUserId = async (request: Request) => {
  const token = getSessionToken(request);
  if (!token) return "";
  const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; expiresAt?: string } | null;
  return session?.userId && session.expiresAt && Date.parse(session.expiresAt) > Date.now() ? cleanAccessUserId(session.userId) : "";
};

const getUser = async (id: string) => leaderboardStore().get(id, { type: "json", consistency: "strong" }) as Promise<LeaderboardUser | null>;
const requirePair = async (first: string, second: string) => Boolean(first && second && first !== second && await getUser(first) && await getUser(second));
const withRecord = async (first: string, second: string) => (await loadAccess(first, second)) ?? makeAccess(first, second);
const isBlocked = (record: MessageAccessRecord, first: string, second: string) => record.blockedBy.includes(first) || record.blockedBy.includes(second);
const publicState = (record: MessageAccessRecord, userId: string, contactId: string) => ({
  userId,
  contactId,
  status: record.requests[userId] === "accepted" || record.requests[contactId] === "accepted" ? "accepted" : record.requests[userId] === "declined" ? "declined" : "none",
  outgoingRequest: record.requests[userId] === "pending",
  incomingRequest: record.requests[contactId] === "pending",
  blockedByMe: record.blockedBy.includes(userId),
  blockedByOther: record.blockedBy.includes(contactId),
  canWrite: userId === ADMIN_ID
    ? !record.blockedBy.includes(userId)
    : !isBlocked(record, userId, contactId) && (record.requests[userId] === "accepted" || record.requests[contactId] === "accepted"),
});

const notify = async (userId: string, type: MessageNotification["type"], contactName: string, contactId: string, message: string) => {
  const key = accessKey(userId, contactId);
  const notification: MessageNotification = {
    id: `${type}-${key}-${contactId}`,
    userId,
    type,
    title: type === "message-request" ? "Запрос на переписку" : type === "message-request-accepted" ? "Переписка разрешена" : "Запрос на переписку отклонён",
    message,
    bugId: contactId,
    xpAwarded: 0,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  await notificationsStore().setJSON(`${userId}/${notification.id}`, notification, { onlyIfNew: true });
};

export default async (request: Request) => {
  try {
    const actor = await sessionUserId(request);
    if (!actor) return jsonError("Войдите в аккаунт заново", 401);
    const url = new URL(request.url);
    if (request.method === "GET") {
      const userId = cleanAccessUserId(url.searchParams.get("userId"));
      const contactId = cleanAccessUserId(url.searchParams.get("contactId"));
      if (actor !== userId || !await requirePair(userId, contactId)) return jsonError("Нет доступа к этому диалогу", 403);
      return Response.json(publicState(await withRecord(userId, contactId), userId, contactId));
    }

    const payload = await request.json() as { userId?: string; contactId?: string; action?: "request" | "accept" | "decline" | "block" | "unblock" };
    const userId = cleanAccessUserId(payload.userId ?? actor);
    const contactId = cleanAccessUserId(payload.contactId);
    if (actor !== userId || !await requirePair(userId, contactId)) return jsonError("Нет доступа к этому диалогу", 403);
    let record = await withRecord(userId, contactId);
    const action = payload.action;
    if (action === "request") {
      if (isBlocked(record, userId, contactId)) return jsonError(record.blockedBy.includes(userId) ? "Сначала разблокируйте пользователя" : "Вы были заблокированы", 403);
      if (publicState(record, userId, contactId).canWrite) return Response.json(publicState(record, userId, contactId));
      if (record.requests[userId] === "pending") return Response.json(publicState(record, userId, contactId));
      if (record.requests[userId] === "declined") return jsonError("Вам отказано в доступе пользователем", 403);
      record = { ...record, requests: { ...record.requests, [userId]: "pending" }, updatedAt: new Date().toISOString() };
      await saveAccess(record);
      const target = await getUser(contactId);
      await notify(contactId, "message-request", String(target?.name ?? contactId), userId, `Пользователь ${String((await getUser(userId))?.name ?? userId)} хочет начать с вами переписку.`);
      return Response.json(publicState(record, userId, contactId), { status: 201 });
    }
    if (action === "accept" || action === "decline") {
      if (record.requests[contactId] !== "pending") return jsonError("Запрос уже обработан", 409);
      const nextStatus = action === "accept" ? "accepted" : "declined";
      record = { ...record, requests: { ...record.requests, [contactId]: nextStatus }, updatedAt: new Date().toISOString() };
      await saveAccess(record);
      const actorName = String((await getUser(userId))?.name ?? userId);
      await notify(contactId, action === "accept" ? "message-request-accepted" : "message-request-declined", actorName, userId, action === "accept" ? `${actorName} разрешил(а) вам отправлять сообщения.` : `${actorName} отклонил(а) запрос на переписку.`);
      await notificationsStore().delete(`${userId}/message-request-${accessKey(userId, contactId)}-${contactId}`);
      return Response.json(publicState(record, userId, contactId));
    }
    if (action === "block" || action === "unblock") {
      const blockedBy = new Set(record.blockedBy);
      if (action === "block") blockedBy.add(userId); else blockedBy.delete(userId);
      record = { ...record, blockedBy: [...blockedBy], updatedAt: new Date().toISOString() };
      await saveAccess(record);
      return Response.json(publicState(record, userId, contactId));
    }
    return jsonError("Неизвестная операция", 400);
  } catch (error) {
    console.error("Message access function failed", error);
    return jsonError("Не удалось обновить доступ к сообщениям", 500);
  }
};

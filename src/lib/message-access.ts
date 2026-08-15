export type MessageAccess = {
  userId: string;
  contactId: string;
  status: "accepted" | "declined" | "none";
  outgoingRequest: boolean;
  incomingRequest: boolean;
  blockedByMe: boolean;
  blockedByOther: boolean;
  canWrite: boolean;
};

const STORAGE_KEY = "atlasum-message-access-v1";
type LocalAccess = Record<string, { requests: Record<string, "pending" | "accepted" | "declined">; blockedBy: string[] }>;
const accessKey = (first: string, second: string) => [first, second].sort((left, right) => left.localeCompare(right)).join("--");
const emptyAccess = (userId: string, contactId: string): MessageAccess => ({ userId, contactId, status: "none", outgoingRequest: false, incomingRequest: false, blockedByMe: false, blockedByOther: false, canWrite: userId === "lonexnesss" });

const readLocal = (): LocalAccess => {
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as LocalAccess; } catch { return {}; }
};
const writeLocal = (value: LocalAccess) => window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
const saveRequestState = (userId: string, contactId: string, state: "pending" | "accepted" | "declined") => {
  const stored = readLocal();
  const key = accessKey(userId, contactId);
  const entry = stored[key] ?? { requests: {}, blockedBy: [] };
  entry.requests[userId] = state;
  stored[key] = entry;
  writeLocal(stored);
};
const toAccess = (userId: string, contactId: string, entry?: LocalAccess[string]): MessageAccess => {
  const requests = entry?.requests ?? {};
  const blockedBy = entry?.blockedBy ?? [];
  const blockedByMe = blockedBy.includes(userId);
  const blockedByOther = blockedBy.includes(contactId);
  const accepted = requests[userId] === "accepted" || requests[contactId] === "accepted";
  return { userId, contactId, status: accepted ? "accepted" : requests[userId] === "declined" ? "declined" : "none", outgoingRequest: requests[userId] === "pending", incomingRequest: requests[contactId] === "pending", blockedByMe, blockedByOther, canWrite: userId === "lonexnesss" ? !blockedByMe : accepted && !blockedByMe && !blockedByOther };
};

const request = async <T,>(method: "GET" | "POST" | "PATCH", userId: string, contactId: string, authToken: string, action?: string) => {
  const search = method === "GET" ? `?${new URLSearchParams({ userId, contactId }).toString()}` : "";
  const response = await fetch(`/.netlify/functions/message-access${search}`, {
    method,
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
    ...(method === "GET" ? {} : { body: JSON.stringify({ userId, contactId, action }) }),
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Не удалось обновить доступ к сообщениям");
  return result;
};

export const getMessageAccess = async (userId: string, contactId: string, authToken: string): Promise<MessageAccess> => {
  if (!userId || !contactId || userId === contactId) return emptyAccess(userId, contactId);
  try {
    const remote = await request<MessageAccess>("GET", userId, contactId, authToken);
    const local = toAccess(userId, contactId, readLocal()[accessKey(userId, contactId)]);
    if (remote.canWrite || remote.status === "declined" || remote.outgoingRequest || remote.incomingRequest || remote.blockedByMe || remote.blockedByOther) {
      if (remote.status === "declined") saveRequestState(userId, contactId, "declined");
      else if (remote.canWrite) saveRequestState(userId, contactId, "accepted");
      else if (remote.outgoingRequest) saveRequestState(userId, contactId, "pending");
      return remote;
    }
    return local.outgoingRequest ? { ...remote, outgoingRequest: true, canWrite: false } : remote;
  } catch (error) {
    const local = toAccess(userId, contactId, readLocal()[accessKey(userId, contactId)]);
    if (!import.meta.env.PROD || local.outgoingRequest || local.incomingRequest || local.status === "declined" || local.canWrite) return local;
    throw error;
  }
};

export const updateMessageAccess = async (userId: string, contactId: string, authToken: string, action: "request" | "accept" | "decline" | "block" | "unblock"): Promise<MessageAccess> => {
  if (!userId || !contactId || userId === contactId) throw new Error("Нельзя изменить доступ к этому диалогу");
  if (action === "request") saveRequestState(userId, contactId, "pending");
  try {
    const remote = await request<MessageAccess>(action === "request" ? "POST" : "PATCH", userId, contactId, authToken, action);
    if (action === "request" && remote.outgoingRequest) saveRequestState(userId, contactId, "pending");
    if (action === "accept") saveRequestState(contactId, userId, "accepted");
    if (action === "decline") saveRequestState(contactId, userId, "declined");
    return remote;
  } catch (error) {
    if (import.meta.env.PROD) throw error;
    const stored = readLocal();
    const key = accessKey(userId, contactId);
    const entry = stored[key] ?? { requests: {}, blockedBy: [] };
    if (action === "request") entry.requests[userId] = "pending";
    if (action === "accept") entry.requests[contactId] = "accepted";
    if (action === "decline") entry.requests[contactId] = "declined";
    if (action === "block" && !entry.blockedBy.includes(userId)) entry.blockedBy.push(userId);
    if (action === "unblock") entry.blockedBy = entry.blockedBy.filter((id) => id !== userId);
    stored[key] = entry;
    writeLocal(stored);
    return toAccess(userId, contactId, entry);
  }
};

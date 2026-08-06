import { getStore } from "@netlify/blobs";

type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  reactions?: Record<string, string[]>;
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "👏", "🤔"];
const DELETED_USER_IDS = new Set(["test"]);

const messagesStore = () => getStore({ name: "design-tests-messages", consistency: "strong" });
const inboxStore = () => getStore({ name: "design-tests-message-inbox", consistency: "strong" });
const leaderboardStore = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });

const cleanUserId = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);

const conversationKey = (firstUserId: string, secondUserId: string) =>
  [firstUserId, secondUserId].sort((left, right) => left.localeCompare(right)).join("--");

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const requireParticipants = async (firstUserId: string, secondUserId: string) => {
  if (!firstUserId || !secondUserId || firstUserId === secondUserId || DELETED_USER_IDS.has(firstUserId) || DELETED_USER_IDS.has(secondUserId)) return false;
  const leaderboard = leaderboardStore();
  const [first, second] = await Promise.all([
    leaderboard.get(firstUserId, { consistency: "strong" }),
    leaderboard.get(secondUserId, { consistency: "strong" }),
  ]);
  return Boolean(first && second);
};

const requireUser = async (userId: string) => {
  if (!userId || DELETED_USER_IDS.has(userId)) return false;
  return Boolean(await leaderboardStore().get(userId, { consistency: "strong" }));
};

const listInbox = async (userId: string) => {
  const inbox = inboxStore();
  const { blobs } = await inbox.list({ prefix: `${userId}/` });
  const values = await Promise.all(blobs.map((blob) => inbox.get(blob.key, { type: "json", consistency: "strong" })));
  return values
    .filter((value): value is ChatMessage => Boolean(value && typeof value === "object"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-300);
};

const listConversation = async (firstUserId: string, secondUserId: string) => {
  const messages = messagesStore();
  const prefix = `${conversationKey(firstUserId, secondUserId)}/`;
  const { blobs } = await messages.list({ prefix });
  const values = await Promise.all(blobs.map((blob) => messages.get(blob.key, { type: "json", consistency: "strong" })));
  return values
    .filter((value): value is ChatMessage => Boolean(value && typeof value === "object"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-300);
};

export default async (request: Request) => {
  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const userId = cleanUserId(url.searchParams.get("userId"));
      if (userId) {
        if (!await requireUser(userId)) return jsonError("Пользователь не найден в рейтинге", 403);
        return Response.json(await listInbox(userId));
      }
      const firstUserId = cleanUserId(url.searchParams.get("firstUserId"));
      const secondUserId = cleanUserId(url.searchParams.get("secondUserId"));
      if (!await requireParticipants(firstUserId, secondUserId)) {
        return jsonError("Участники диалога не найдены в рейтинге", 403);
      }
      return Response.json(await listConversation(firstUserId, secondUserId));
    }

    if (request.method === "POST") {
      const payload = await request.json() as Partial<ChatMessage>;
      const senderId = cleanUserId(payload.senderId);
      const recipientId = cleanUserId(payload.recipientId);
      const text = String(payload.text ?? "").trim();
      if (!text || text.length > 1000) return jsonError("Некорректный текст сообщения", 400);
      if (!await requireParticipants(senderId, recipientId)) {
        return jsonError("Оба пользователя должны быть участниками рейтинга", 403);
      }

      const message: ChatMessage = {
        id: crypto.randomUUID(),
        senderId,
        recipientId,
        text,
        createdAt: new Date().toISOString(),
        reactions: {},
      };
      const key = `${conversationKey(senderId, recipientId)}/${message.createdAt}-${message.id}`;
      const inboxKey = `${recipientId}/${message.createdAt}-${message.id}`;
      await Promise.all([
        messagesStore().setJSON(key, message, { onlyIfNew: true }),
        inboxStore().setJSON(inboxKey, message, { onlyIfNew: true }),
      ]);
      return Response.json(message, { status: 201 });
    }

    if (request.method === "PATCH") {
      const payload = await request.json() as Partial<ChatMessage> & { userId?: string; emoji?: string };
      const senderId = cleanUserId(payload.senderId);
      const recipientId = cleanUserId(payload.recipientId);
      const userId = cleanUserId(payload.userId);
      const emoji = String(payload.emoji ?? "");
      const messageId = String(payload.id ?? "").trim();
      const createdAt = String(payload.createdAt ?? "").trim();
      if (!REACTION_EMOJIS.includes(emoji) || !messageId || !createdAt) return jsonError("Некорректная реакция", 400);
      if (userId !== senderId && userId !== recipientId) return jsonError("Нельзя изменить чужую реакцию", 403);
      if (!await requireParticipants(senderId, recipientId)) return jsonError("Участники диалога не найдены", 403);

      const key = `${conversationKey(senderId, recipientId)}/${createdAt}-${messageId}`;
      const messages = messagesStore();
      const current = await messages.get(key, { type: "json", consistency: "strong" }) as ChatMessage | null;
      if (!current || current.id !== messageId) return jsonError("Сообщение не найдено", 404);

      const reactions = { ...(current.reactions ?? {}) };
      const users = new Set(reactions[emoji] ?? []);
      if (users.has(userId)) users.delete(userId);
      else users.add(userId);
      if (users.size) reactions[emoji] = [...users];
      else delete reactions[emoji];
      const updated = { ...current, reactions };
      const inboxKey = `${recipientId}/${createdAt}-${messageId}`;
      await Promise.all([
        messages.setJSON(key, updated),
        inboxStore().setJSON(inboxKey, updated),
      ]);
      return Response.json(updated);
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, PATCH" } });
  } catch (error) {
    console.error("Messages function failed", error);
    return jsonError("Не удалось синхронизировать сообщения", 500);
  }
};

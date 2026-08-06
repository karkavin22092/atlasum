import { getStore } from "@netlify/blobs";

type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
};

const messagesStore = () => getStore({ name: "design-tests-messages", consistency: "strong" });
const leaderboardStore = () => getStore({ name: "design-tests-leaderboard", consistency: "strong" });

const cleanUserId = (value: unknown) =>
  String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);

const conversationKey = (firstUserId: string, secondUserId: string) =>
  [firstUserId, secondUserId].sort((left, right) => left.localeCompare(right)).join("--");

const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const requireParticipants = async (firstUserId: string, secondUserId: string) => {
  if (!firstUserId || !secondUserId || firstUserId === secondUserId) return false;
  const leaderboard = leaderboardStore();
  const [first, second] = await Promise.all([
    leaderboard.get(firstUserId, { consistency: "strong" }),
    leaderboard.get(secondUserId, { consistency: "strong" }),
  ]);
  return Boolean(first && second);
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
      };
      const key = `${conversationKey(senderId, recipientId)}/${message.createdAt}-${message.id}`;
      await messagesStore().setJSON(key, message, { onlyIfNew: true });
      return Response.json(message, { status: 201 });
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  } catch (error) {
    console.error("Messages function failed", error);
    return jsonError("Не удалось синхронизировать сообщения", 500);
  }
};

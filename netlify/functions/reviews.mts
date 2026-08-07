import { getStore } from "@netlify/blobs";

type Review = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  rating: number;
  text: string;
  pros: string[];
  cons: string[];
  images: string[];
  createdAt: string;
  updatedAt: string;
  adminReply: string | null;
  adminReplyAt: string | null;
};

type StoredUser = { id?: string; name?: string; avatarUrl?: string | null };
type NotificationType = "review-new" | "review-reply";

const ADMIN_ID = "lonexnesss";
const reviewsStore = () => getStore({ name: "design-tests-reviews", consistency: "strong" });
const usersStore = () => getStore({ name: "design-tests-auth-users", consistency: "strong" });
const sessionsStore = () => getStore({ name: "design-tests-auth-sessions", consistency: "strong" });
const notificationsStore = () => getStore({ name: "design-tests-notifications", consistency: "strong" });

const hashHex = async (value: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const cleanId = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-zа-я0-9-]+/giu, "-").slice(0, 80);
const jsonError = (message: string, status: number) => Response.json({ error: message }, { status });

const sessionUser = async (request: Request) => {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const session = await sessionsStore().get(await hashHex(token), { type: "json", consistency: "strong" }) as { userId?: string; expiresAt?: string } | null;
  if (!session?.userId || !session.expiresAt || Date.parse(session.expiresAt) <= Date.now()) return null;
  return cleanId(session.userId);
};

const listReviews = async () => {
  const store = reviewsStore();
  const { blobs } = await store.list();
  const values = await Promise.all(blobs.map((blob) => store.get(blob.key, { type: "json", consistency: "strong" })));
  return values
    .filter((item): item is Review => Boolean(item && typeof item === "object"))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};

const notify = async (userId: string, type: NotificationType, title: string, message: string, reviewId: string) => {
  const id = `${type}-${reviewId}-${Date.now()}`;
  await notificationsStore().setJSON(`${userId}/${id}`, {
    id,
    userId,
    type,
    title,
    message,
    bugId: reviewId,
    xpAwarded: 0,
    createdAt: new Date().toISOString(),
    readAt: null,
  });
};

const findUser = async (userId: string) => {
  const store = usersStore();
  const { blobs } = await store.list();
  for (const blob of blobs) {
    const user = await store.get(blob.key, { type: "json", consistency: "strong" }) as StoredUser | null;
    if (cleanId(user?.id) === userId) return user;
  }
  return null;
};

const cleanTags = (value: unknown, fallback: string[]) => {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim().slice(0, 60)).filter(Boolean))].slice(0, 8);
};

const cleanImages = (value: unknown, fallback: string[]) => {
  if (value === undefined) return fallback;
  if (!Array.isArray(value)) return [];
  return value
    .map(String)
    .filter((item) => item.startsWith("data:image/") && item.length <= 250_000)
    .slice(0, 3);
};

const normalizeReview = (payload: Record<string, unknown>, current?: Review): Review => ({
  id: current?.id ?? crypto.randomUUID(),
  authorId: cleanId(payload.authorId ?? current?.authorId),
  authorName: String(payload.authorName ?? current?.authorName ?? "Пользователь").trim().replace(/\s+/g, " ").slice(0, 40),
  authorAvatarUrl: payload.authorAvatarUrl == null ? (current?.authorAvatarUrl ?? null) : String(payload.authorAvatarUrl).slice(0, 350_000),
  rating: Math.min(5, Math.max(1, Math.round(Number(payload.rating ?? current?.rating ?? 5)))),
  text: String(payload.text ?? current?.text ?? "").trim().slice(0, 2000),
  pros: cleanTags(payload.pros, current?.pros ?? []),
  cons: cleanTags(payload.cons, current?.cons ?? []),
  images: cleanImages(payload.images, current?.images ?? []),
  createdAt: current?.createdAt ?? new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  adminReply: current?.adminReply ?? null,
  adminReplyAt: current?.adminReplyAt ?? null,
});

export default async (request: Request) => {
  try {
    if (request.method === "GET") return Response.json(await listReviews());

    const userId = await sessionUser(request);
    if (!userId) return jsonError("Войдите, чтобы оставить отзыв", 401);
    const payload = await request.json() as Record<string, unknown>;
    const store = reviewsStore();

    if (request.method === "POST") {
      const existing = await store.get(userId, { type: "json", consistency: "strong" }) as Review | null;
      const author = await findUser(userId);
      if (!author) return jsonError("Профиль автора не найден", 403);
      const review = normalizeReview({
        ...payload,
        authorId: userId,
        authorName: author.name ?? payload.authorName,
        authorAvatarUrl: author.avatarUrl ?? null,
      }, existing ?? undefined);
      if (!review.text) return jsonError("Напишите текст отзыва", 400);
      await store.setJSON(userId, review);
      if (!existing) {
        await notify(ADMIN_ID, "review-new", "Новый отзыв", `${review.authorName} оставил отзыв на ${review.rating}/5`, review.id);
      }
      return Response.json(review, { status: existing ? 200 : 201 });
    }

    if (request.method === "PATCH") {
      const id = String(payload.id ?? "").trim();
      if (!id) return jsonError("Отзыв не найден", 404);

      if (payload.action === "reply") {
        if (userId !== ADMIN_ID) return jsonError("Недостаточно прав", 403);
        const current = (await listReviews()).find((item) => item.id === id);
        if (!current) return jsonError("Отзыв не найден", 404);
        const reply = String(payload.reply ?? "").trim().slice(0, 1200);
        if (!reply) return jsonError("Введите ответ", 400);
        const updated: Review = {
          ...current,
          adminReply: reply,
          adminReplyAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await store.setJSON(current.authorId, updated);
        await notify(current.authorId, "review-reply", "Ответ на ваш отзыв", "Создатель ответил на ваш отзыв", current.id);
        return Response.json(updated);
      }

      const current = await store.get(userId, { type: "json", consistency: "strong" }) as Review | null;
      if (!current || current.id !== id) return jsonError("Недостаточно прав", 403);
      const author = await findUser(userId);
      const updated = normalizeReview({
        ...payload,
        authorId: userId,
        authorName: author?.name ?? current.authorName,
        authorAvatarUrl: author?.avatarUrl ?? null,
      }, current);
      if (!updated.text) return jsonError("Напишите текст отзыва", 400);
      await store.setJSON(userId, updated);
      return Response.json(updated);
    }

    if (request.method === "DELETE") {
      if (userId !== ADMIN_ID) return jsonError("Удалять отзывы может только создатель", 403);
      const id = String(payload.id ?? "").trim();
      const current = (await listReviews()).find((item) => item.id === id);
      if (!current) return jsonError("Отзыв не найден", 404);
      await store.delete(current.authorId);
      return Response.json({ ok: true });
    }

    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST, PATCH, DELETE" } });
  } catch (error) {
    console.error("Reviews function failed", error);
    return jsonError("Сервис отзывов временно недоступен", 500);
  }
};

export type Review = {
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

export type ReviewPayload = Pick<Review, "authorId" | "authorName" | "rating" | "text" | "pros" | "cons" | "images"> & {
  authorAvatarUrl?: string | null;
};

const localKey = "design-tests-reviews-v1";

const readLocal = (): Review[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(localKey) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeLocal = (reviews: Review[]) => window.localStorage.setItem(localKey, JSON.stringify(reviews));

class ReviewRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const request = async <T,>(init?: RequestInit, token?: string) => {
  const response = await fetch("/.netlify/functions/reviews", {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new ReviewRequestError(result.error ?? "Не удалось выполнить действие с отзывом", response.status);
  return result;
};

const saveLocalReview = (payload: ReviewPayload, id?: string) => {
  const existing = readLocal();
  const current = existing.find((review) => review.authorId === payload.authorId || review.id === id);
  const now = new Date().toISOString();
  const review: Review = {
    id: current?.id ?? crypto.randomUUID(),
    ...payload,
    authorAvatarUrl: payload.authorAvatarUrl ?? current?.authorAvatarUrl ?? null,
    createdAt: current?.createdAt ?? now,
    updatedAt: now,
    adminReply: current?.adminReply ?? null,
    adminReplyAt: current?.adminReplyAt ?? null,
  };
  writeLocal([review, ...existing.filter((item) => item.authorId !== review.authorId && item.id !== review.id)]);
  return review;
};

export const getReviews = async () => import.meta.env.PROD ? request<Review[]>() : readLocal();

export const saveReview = async (payload: ReviewPayload, token?: string) => {
  if (!import.meta.env.PROD) return saveLocalReview(payload);
  return request<Review>({ method: "POST", body: JSON.stringify(payload) }, token);
};

export const updateReview = async (id: string, payload: ReviewPayload, token?: string) => {
  if (!import.meta.env.PROD) return saveLocalReview(payload, id);
  return request<Review>({ method: "PATCH", body: JSON.stringify({ id, ...payload }) }, token);
};

export const replyToReview = async (id: string, reply: string, token: string) => {
  if (import.meta.env.PROD) {
    return request<Review>({ method: "PATCH", body: JSON.stringify({ action: "reply", id, reply }) }, token);
  }
  const existing = readLocal();
  const current = existing.find((item) => item.id === id);
  if (!current) throw new Error("Отзыв не найден");
  const updated: Review = { ...current, adminReply: reply.trim(), adminReplyAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  writeLocal(existing.map((item) => item.id === id ? updated : item));
  return updated;
};

export const syncLocalReviewAvatar = (authorId: string, avatarUrl: string | null) => {
  if (import.meta.env.PROD) return;
  writeLocal(readLocal().map((review) => review.authorId === authorId ? { ...review, authorAvatarUrl: avatarUrl } : review));
};

export const deleteReview = async (id: string, token: string) => {
  if (import.meta.env.PROD) {
    return request<{ ok: boolean }>({ method: "DELETE", body: JSON.stringify({ id }) }, token);
  }
  writeLocal(readLocal().filter((review) => review.id !== id));
  return { ok: true };
};

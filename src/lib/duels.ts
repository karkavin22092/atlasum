import type { AnswerValue } from "@/components/question-renderer";
import type { SubjectId } from "@shared/types";

export type DuelQuestion = {
  id: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  type: "single" | "multiple" | "trueFalse" | "matching" | "sequence" | "fill" | "imageChoice" | "scenario";
  question: string;
  options: Array<{ id: string; text: string; image?: string }>;
  correct: "__hidden__";
  explanation: string;
  source: string;
  tags: string[];
  media?: { kind: "image"; src: string; alt: string };
  meta?: Record<string, unknown>;
};

export type Duel = {
  id: string;
  inviter: { id: string; name: string; avatarUrl: string | null };
  invitee: { id: string; name: string; avatarUrl: string | null };
  opponent: { id: string; name: string; avatarUrl: string | null };
  you: { id: string; name: string; avatarUrl: string | null };
  subject: SubjectId;
  questions: DuelQuestion[];
  status: "pending" | "active" | "finished" | "cancelled" | "declined";
  createdAt: string;
  expiresAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  winnerId: string | null;
  result: "win" | "draw" | "cancelled" | null;
  cancelReason: string | null;
  yourAttempt: { answers: Array<{ questionId: string; answer: unknown }>; score: number; submittedAt: string | null; complete: boolean; leftAt?: string | null } | null;
  scores: Record<string, number | null>;
  rewardXp: Record<string, number>;
};

const request = async <T,>(token: string, init?: RequestInit, query = "") => {
  const response = await fetch(`/.netlify/functions/duels${query}`, {
    ...init,
    cache: "no-store",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Не удалось синхронизировать игру");
  return result as T;
};

export const getDuels = (token: string) => request<Duel[]>(token);
export const getDuel = (token: string, id: string) => request<Duel>(token, undefined, `?action=state&id=${encodeURIComponent(id)}`);
export const inviteDuel = (token: string, opponentId: string, subject: SubjectId) => request<Duel>(token, { method: "POST", body: JSON.stringify({ action: "invite", opponentId, subject }) });
export const acceptDuel = (token: string, id: string) => request<Duel>(token, { method: "POST", body: JSON.stringify({ action: "accept", id }) });
export const declineDuel = (token: string, id: string) => request<Duel>(token, { method: "POST", body: JSON.stringify({ action: "decline", id }) });
export const cancelDuel = (token: string, id: string, keepalive = false) => request<Duel>(token, { method: "POST", body: JSON.stringify({ action: "cancel", id }), keepalive });
export const leaveDuel = (token: string, id: string, keepalive = false) => request<Duel>(token, { method: "POST", body: JSON.stringify({ action: "leave", id }), keepalive });
export const submitDuel = (token: string, id: string, answers: Array<{ questionId: string; answer: AnswerValue | "__timeout__" }>) => request<Duel>(token, { method: "POST", body: JSON.stringify({ action: "submit", id, answers }) });

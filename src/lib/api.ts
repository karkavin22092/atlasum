import type {
  AttemptSubmission,
  DashboardMeta,
  GeneratedTest,
  Profile,
  ProfileStats,
  Question,
  SubmissionResponse,
} from "@shared/types";

const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  return response.json() as Promise<T>;
}

export const api = {
  meta: (profileName: string) => request<DashboardMeta & {
    profile: { id: string; name: string; xp: number; coins: number; level: number; streak: number; bestStreak: number; lastActiveAt: string | null };
    stats: {
      totalQuestionsAnswered: number;
      totalCorrect: number;
      accuracy: number;
      xpPerLevel: number;
      nextLevelXp: number;
      levelProgress: number;
      reviewDue: number;
      mastered: number;
      weak: number;
    };
    leaderboard: Array<{ rank: number; id: string; name: string; xp: number; level: number; streak: number; bestStreak: number; attempts: number; accuracy: number; lastActiveAt: string | null }>;
    activity: Array<{ date: string; attempts: number; correct: number; xp: number }>;
    topicProgress: Array<{ key: string; title: string; description: string; source: string; color: string; mastery: number; answered: number }>;
    attempts: Array<{ id: string; mode: string; count: number; score: number; maxScore: number; percent: number; grade: string; durationMs: number; topic: string | null; createdAt: string; items: Array<{ questionId: string; topic: string; difficulty: string; isCorrect: boolean; userAnswer: unknown; correctAnswer: unknown; explanation: string }>; }>;
    achievements: Array<{ key: string; title: string; description: string; icon: string; unlockedAt: string }>;
    questionBank: { total: number; topics: Array<{ key: string; title: string; questions: number }> };
  }>(`/api/meta?profileName=${encodeURIComponent(profileName)}`),
  generateTest: (payload: { profileName: string; mode: string; count: number; topic?: string | null }) =>
    request<GeneratedTest>("/api/tests/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  submitTest: (payload: AttemptSubmission) =>
    request<SubmissionResponse>("/api/tests/submit", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  questions: (params?: { topic?: string; difficulty?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.topic) query.set("topic", params.topic);
    if (params?.difficulty) query.set("difficulty", params.difficulty);
    if (params?.search) query.set("search", params.search);
    return request<Question[]>(`/api/questions${query.toString() ? `?${query.toString()}` : ""}`);
  },
  exportQuestions: () => request<Question[]>("/api/questions/export"),
  createQuestion: (payload: Question) =>
    request<Question>("/api/questions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateQuestion: (id: string, payload: Partial<Question>) =>
    request<Question>(`/api/questions/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteQuestion: (id: string) =>
    request<{ ok: boolean }>(`/api/questions/${id}`, {
      method: "DELETE",
    }),
  importQuestions: (questions: Question[]) =>
    request<{ imported: number }>("/api/questions/import", {
      method: "POST",
      body: JSON.stringify({ questions }),
    }),
  ranking: () => request<Array<{ rank: number; id: string; name: string; xp: number; level: number; streak: number; bestStreak: number; attempts: number; accuracy: number; lastActiveAt: string | null }>>("/api/ranking"),
  profile: (profileName: string) =>
    request<{ profile: Profile; stats: ProfileStats }>(`/api/profile?profileName=${encodeURIComponent(profileName)}`),
  reviews: (profileName: string) => request<Array<{ questionId: string; topic: string; difficulty: string; question: string; mastery: number; accuracy: number; timesAnswered: number; correctCount: number; lastAnsweredAt: string | null; nextReviewAt: string | null; options: unknown }>>(`/api/reviews?profileName=${encodeURIComponent(profileName)}`),
};

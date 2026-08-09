import type { DashboardMeta, NashelingoLevelProgress, NashelingoTheoryProgress } from "@shared/types";

export type AppPageProps = {
  meta?: DashboardMeta & {
    profile: {
      id: string;
      name: string;
      xp: number;
      level: number;
      streak: number;
      bestStreak: number;
      lastActiveAt: string | null;
    };
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
    leaderboard: Array<{ rank: number; id: string; name: string; avatarUrl: string | null; xp: number; level: number; streak: number; bestStreak: number; attempts: number; accuracy: number; lastActiveAt: string | null; lastSeenAt: string | null }>;
    activity: Array<{ date: string; attempts: number; correct: number; xp: number }>;
    topicProgress: Array<{ key: string; title: string; description: string; source: string; color: string; subject?: "it-design" | "management" | "economics" | "english"; mastery: number; answered: number }>;
    theoryProgress: NashelingoTheoryProgress[];
    nashelingoLevelProgress: NashelingoLevelProgress[];
    attempts: Array<{ id: string; mode: string; count: number; score: number; maxScore: number; percent: number; grade: string; durationMs: number; topic: string | null; createdAt: string; items: Array<{ questionId: string; topic: string; difficulty: string; isCorrect: boolean; userAnswer: unknown; correctAnswer: unknown; explanation: string }>; }>;
    achievements: Array<{ key: string; title: string; description: string; icon: string; unlockedAt: string }>;
    questionBank: { total: number; topics: Array<{ key: string; title: string; questions: number }> };
  };
  profileName: string;
};

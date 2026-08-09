import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { prisma } from "./db.js";
import { dashboardMeta, topicCatalog } from "./content.js";
import {
  buildQuestionBankSummary,
  createRandom,
  evaluateQuestion,
  generateQuestionBank,
  getCorrectAnswerPreview,
  getUserAnswerPreview,
  getTopicByTitle,
  normalizeText,
  shuffle,
  topicKeys,
} from "./question-bank.js";
import type {
  AttemptResult,
  AttemptSubmission,
  GeneratedTest,
  NashelingoLevelProgress,
  Profile,
  ProfileStats,
  Question,
  SubjectId,
  SubmissionResponse,
} from "@shared/types";
import { sanitizeQuestionText } from "@shared/question-text";
import {
  createQuestionUniquenessState,
  tryAddUniqueQuestion,
  type QuestionUniquenessState,
} from "@shared/question-uniqueness";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "4mb" }));

const PROFILE_ID_FALLBACK = "local-user";

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/giu, "-")
    .replace(/^-+|-+$/g, "") || PROFILE_ID_FALLBACK;

const formatDateKey = (date = new Date()) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Novosibirsk",
  }).format(date);

const getLevel = (xp: number) => Math.max(1, Math.floor(xp / 250) + 1);

const getXpThreshold = (level: number) => level * 250;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const ensureProfile = async (profileName?: string) => {
  const name = profileName?.trim() || "Гость";
  const id = slugify(name);

  return prisma.profile.upsert({
    where: { id },
    create: {
      id,
      name,
      xp: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      lastActiveAt: new Date(),
    },
    update: {
      name,
    },
  });
};

const toProfile = (profile: {
  id: string;
  name: string;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  lastActiveAt: Date | null;
}): Profile => ({
  id: profile.id,
  name: profile.name,
  xp: profile.xp,
  level: profile.level,
  streak: profile.streak,
  bestStreak: profile.bestStreak,
  lastActiveAt: profile.lastActiveAt ? profile.lastActiveAt.toISOString() : null,
});

type ProfileReviewState = {
  timesAnswered: number;
  correctCount: number;
  nextReviewAt: Date;
  intervalDays: number;
  easeFactor: number;
  mastery: number;
};

type ReviewAttemptItem = {
  questionId: string;
  difficulty: string;
  isCorrect: boolean;
  createdAt: Date;
};

const replayProfileReviews = (items: ReviewAttemptItem[]) => {
  const reviews = new Map<string, ProfileReviewState>();

  for (const item of items) {
    const current = reviews.get(item.questionId) ?? {
      timesAnswered: 0,
      correctCount: 0,
      nextReviewAt: new Date(0),
      intervalDays: 0,
      easeFactor: 2.5,
      mastery: 0,
    };
    const easeFactor = clamp(current.easeFactor + (item.isCorrect ? 0.08 : -0.18), 1.3, 3);
    const intervalDays = item.isCorrect ? Math.max(1, Math.round((current.intervalDays || 1) * easeFactor)) : 1;
    reviews.set(item.questionId, {
      timesAnswered: current.timesAnswered + 1,
      correctCount: current.correctCount + (item.isCorrect ? 1 : 0),
      nextReviewAt: new Date(item.createdAt.getTime() + intervalDays * 24 * 60 * 60 * 1000),
      intervalDays,
      easeFactor,
      mastery: clamp(item.isCorrect ? current.mastery + (item.difficulty === "hard" ? 0.08 : 0.12) : current.mastery - 0.14, 0, 1),
    });
  }

  return reviews;
};

const getProfileStats = async (profileId: string): Promise<ProfileStats> => {
  const [items, profile] = await Promise.all([
    prisma.attemptItem.findMany({
      where: { attempt: { profileId } },
      orderBy: { createdAt: "asc" },
      select: { questionId: true, difficulty: true, isCorrect: true, createdAt: true },
    }),
    prisma.profile.findUnique({ where: { id: profileId } }),
  ]);
  const reviews = replayProfileReviews(items);
  const now = new Date();
  const answered = items.length;
  const correct = items.filter((item) => item.isCorrect).length;
  const reviewDue = [...reviews.values()].filter((review) => review.timesAnswered > 0 && review.nextReviewAt <= now).length;
  const mastered = [...reviews.values()].filter((review) => review.timesAnswered > 0 && review.mastery >= 0.8).length;
  const weak = [...reviews.values()].filter((review) => review.timesAnswered > 0 && review.mastery < 0.45).length;

  const xp = profile?.xp ?? 0;
  const level = profile?.level ?? getLevel(xp);
  const nextLevelXp = getXpThreshold(level);
  const levelStartXp = getXpThreshold(level - 1);
  const levelProgress = nextLevelXp === levelStartXp ? 0 : clamp(((xp - levelStartXp) / (nextLevelXp - levelStartXp)) * 100, 0, 100);

  return {
    totalQuestionsAnswered: answered,
    totalCorrect: correct,
    accuracy: answered === 0 ? 0 : Math.round((correct / answered) * 1000) / 10,
    xpPerLevel: 250,
    nextLevelXp,
    levelProgress,
    reviewDue,
    mastered,
    weak,
  };
};

const buildTopicProgress = async () => {
  const reviews = await prisma.questionReview.findMany({
    include: {
      question: true,
    },
  });

  const buckets = new Map<string, { title: string; total: number; mastered: number; answered: number }>();

  for (const review of reviews) {
    const key = review.question.topic;
    const current = buckets.get(key) ?? {
      title: key,
      total: 0,
      mastered: 0,
      answered: 0,
    };

    current.total += 1;
    current.answered += review.timesAnswered;
    if (review.mastery >= 0.7) {
      current.mastered += 1;
    }
    buckets.set(key, current);
  }

  return topicCatalog.map((topic) => {
    const bucket = buckets.get(topic.title) ?? {
      title: topic.title,
      total: 0,
      mastered: 0,
      answered: 0,
    };

    return {
      ...topic,
      mastery: bucket.total === 0 ? 0 : Math.round((bucket.mastered / bucket.total) * 1000) / 10,
      answered: bucket.answered,
    };
  });
};

const buildLeaderboard = async () => {
  const profiles = await prisma.profile.findMany({
    orderBy: [{ xp: "desc" }, { updatedAt: "asc" }],
    take: 10,
    include: {
      attempts: true,
    },
  });

  return profiles.map((profile, index) => {
    const attempts = profile.attempts.length;
    const totalPercent = profile.attempts.reduce((sum, attempt) => sum + attempt.percent, 0);
    const avgPercent = attempts === 0 ? 0 : Math.round((totalPercent / attempts) * 10) / 10;

    return {
      rank: index + 1,
      id: profile.id,
      name: profile.name,
      avatarUrl: null,
      xp: profile.xp,
      level: profile.level,
      streak: profile.streak,
      bestStreak: profile.bestStreak,
      attempts,
      accuracy: avgPercent,
      lastActiveAt: profile.lastActiveAt?.toISOString() ?? null,
      lastSeenAt: null,
    };
  });
};

const buildActivity = async (profileId: string) => {
  const rows = await prisma.activityDay.findMany({
    where: { profileId },
    orderBy: { date: "asc" },
  });

  return rows.map((row) => ({
    date: row.date,
    attempts: row.attempts,
    correct: row.correct,
    xp: row.xp,
  }));
};

const buildAchievements = async (profileId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      attempts: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      achievements: true,
    },
  });

  if (!profile) {
    return [];
  }

  const totalAnswered = await prisma.attemptItem.count({
    where: { attempt: { profileId } },
  });
  const totalCorrect = await prisma.attemptItem.count({
    where: { attempt: { profileId }, isCorrect: true },
  });
  const hardCorrect = await prisma.attemptItem.count({
    where: {
      attempt: { profileId },
      isCorrect: true,
      difficulty: "hard",
    },
  });
  const progress = await buildTopicProgress();
  const masteredTopics = progress.filter((topic) => topic.mastery >= 70).length;

  const unlocked: Array<{ key: string; title: string; description: string; icon: string }> = [];
  const unlockedAt = new Date();
  const isEligible = (key: string) =>
    profile.achievements?.some((achievement) => achievement.key === key) ?? false;
  const push = async (key: string, title: string, description: string, icon: string, condition: boolean) => {
    if (!condition || isEligible(key)) {
      return;
    }
    await prisma.profileAchievement.upsert({
      where: {
        profileId_key: {
          profileId,
          key,
        },
      },
      create: {
        profileId,
        key,
        title,
        description,
        icon,
        unlockedAt,
      },
      update: {},
    });
    unlocked.push({ key, title, description, icon });
  };

  await push("first-step", "Первый шаг", "Пройти первый тест", "Sparkles", totalAnswered >= 1);
  await push("hundred-correct", "Знаток", "Ответить правильно на 100 вопросов", "Award", totalCorrect >= 100);
  await push("streak-7", "Серия", "Поддержать серию из 7 дней", "Flame", profile.streak >= 7);
  await push("level-5", "Продвинутый", "Достичь 5 уровня", "Medal", profile.level >= 5);
  await push("hard-20", "Сложный путь", "Правильно решить 20 сложных вопросов", "ShieldCheck", hardCorrect >= 20);
  await push("topic-master", "Мастер тем", "Освоить не менее 10 тем", "Brain", masteredTopics >= 10);

  return unlocked;
};

const weightQuestion = (question: Question & { reviews: Array<{ mastery: number; nextReviewAt: Date | null; timesAnswered: number }> }, seed: string) => {
  const review = question.reviews[0];
  const mastery = review?.mastery ?? 0;
  const answered = review?.timesAnswered ?? 0;
  const dueBonus = review?.nextReviewAt && review.nextReviewAt <= new Date() ? 2 : 0;
  const hardBonus = question.difficulty === "hard" ? 1.4 : question.difficulty === "medium" ? 1 : 0.7;
  const lowMasteryBonus = 1 + (1 - mastery) * 3;
  const fatigueBonus = 1 + Math.max(0, 5 - answered) * 0.1;
  const randomBonus = createRandom(`${seed}:${question.id}`)() * 0.5;
  return lowMasteryBonus * hardBonus * fatigueBonus + dueBonus + randomBonus;
};

const uniqueQuestionPool = <T extends { id: string; question: string }>(questions: T[]) => {
  const ids = new Set<string>();
  const prompts = new Set<string>();
  return questions.filter((question) => {
    const prompt = question.question.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
    if (ids.has(question.id) || prompts.has(prompt)) return false;
    ids.add(question.id);
    prompts.add(prompt);
    return true;
  });
};

const appendSemanticQuestions = <T extends { id: string; question: string; topic?: string; type?: string; meta?: unknown }>(
  target: T[],
  candidates: T[],
  limit: number,
  state: QuestionUniquenessState,
) => {
  if (target.length >= limit) return;
  for (const question of candidates) {
    if (target.length >= limit) break;
    if (!tryAddUniqueQuestion(state, question)) continue;
    target.push(question);
  }
};

const nashelingoDifficultyOrder = [
  ["easy", "medium", "hard"],
  ["easy", "medium", "hard"],
  ["medium", "easy", "hard"],
  ["medium", "hard", "easy"],
  ["hard", "medium", "easy"],
];

const selectNashelingoLevel = <T extends {
  id: string;
  question: string;
  difficulty: string;
  topic?: string;
  type?: string;
  meta?: unknown;
  reviews: Array<{ mastery: number; nextReviewAt: Date | null; timesAnswered: number }>;
}>(
  pool: T[],
  count: number,
  requestedLevel: number,
  seed: string,
) => {
  const usedQuestionIds = new Set<string>();
  let requested: typeof pool = [];
  const maxLevel = Math.max(0, Math.min(4, requestedLevel));

  for (let level = 0; level <= maxLevel; level += 1) {
    const difficultyOrder = nashelingoDifficultyOrder[level];
    const candidates = pool
      .filter((question) => !usedQuestionIds.has(question.id))
      .sort((left, right) => {
        const difficulty = difficultyOrder.indexOf(left.difficulty) - difficultyOrder.indexOf(right.difficulty);
        return difficulty || weightQuestion(right as never, `${seed}:nashelingo:${level}`) - weightQuestion(left as never, `${seed}:nashelingo:${level}`);
      });
    const selected: typeof pool = [];
    appendSemanticQuestions(selected, candidates, count, createQuestionUniquenessState());
    if (selected.length < count) {
      for (const question of candidates) {
        if (selected.length >= count) break;
        if (!selected.some((item) => item.id === question.id)) selected.push(question);
      }
    }
    selected.forEach((question) => usedQuestionIds.add(question.id));
    if (level === maxLevel) requested = selected;
  }

  return requested;
};

const syncedGeneratedTopics = new Set<string>();

const syncGeneratedQuestions = async (generatedQuestions: Question[]) => {
  if (!generatedQuestions.length) return;
  const cacheKey = Array.from(new Set(generatedQuestions.map((question) => question.topic))).sort().join("|");
  if (syncedGeneratedTopics.has(cacheKey)) return;

  const existing = new Set((await prisma.question.findMany({
    where: { id: { in: generatedQuestions.map((question) => question.id) } },
    select: { id: true },
  })).map((question) => question.id));
  const missing = generatedQuestions.filter((question) => !existing.has(question.id));
  if (missing.length) {
    await prisma.question.createMany({
      data: missing.map((question) => ({
        id: question.id,
        topic: question.topic,
        difficulty: question.difficulty,
        type: question.type,
        question: question.question,
        options: question.options as never,
        correct: question.correct as never,
        explanation: question.explanation,
        source: question.source,
        tags: question.tags as never,
        meta: (question.meta ?? null) as never,
      })),
    });
  }

  const existingGenerated = generatedQuestions.filter((question) => existing.has(question.id));
  for (let index = 0; index < existingGenerated.length; index += 100) {
    await prisma.$transaction(existingGenerated.slice(index, index + 100).map((question) => prisma.question.update({
      where: { id: question.id },
      data: {
        topic: question.topic,
        difficulty: question.difficulty,
        type: question.type,
        question: question.question,
        options: question.options as never,
        correct: question.correct as never,
        explanation: question.explanation,
        source: question.source,
        tags: question.tags as never,
        meta: (question.meta ?? null) as never,
      },
    })));
  }
  syncedGeneratedTopics.add(cacheKey);
};

const selectQuestions = async ({
  profileId,
  mode,
  count,
  topic,
  topics,
  subject,
  questionType,
  lessonIndex,
}: {
  profileId: string;
  mode: string;
  count: number;
  topic?: string | null;
  topics?: string[];
  subject?: SubjectId;
  questionType?: Question["type"];
  lessonIndex?: number;
}) => {
  const selectionSeed = `${profileId}:${mode}:${topic ?? ""}:${(topics ?? []).join("|")}`;
  const selectedTitles = new Set([...(topics ?? []), topic ?? ""]);
  const selectedTenseTopic = subject === "english"
    && [...selectedTitles].some((value) => dashboardMeta.topics.some((item) => item.key.startsWith("english-tense") && item.title === value));
  const selectedExamOnlyTopic = mode === "exam" && subject === "english"
    && [...(topics ?? []), topic ?? ""].some((value) => dashboardMeta.topics.some((item) => item.examOnly && item.title === value));

  if (selectedExamOnlyTopic || selectedTenseTopic) {
    await syncGeneratedQuestions(generateQuestionBank().filter((question) => selectedTitles.has(question.topic)));
  }

  const questions = await prisma.question.findMany({
    include: {
      reviews: true,
    },
  });

  let pool = uniqueQuestionPool(questions);

  if (subject) {
    const subjectTopics = new Set(dashboardMeta.topics.filter((item) => item.subject === subject).map((item) => item.title));
    pool = pool.filter((item) => subjectTopics.has(item.topic));
  }

  if (topic) {
    pool = pool.filter((item) => item.topic === topic);
  }

  if (topics?.length) {
    pool = pool.filter((item) => topics.includes(item.topic));
  }

  if (mode !== "exam") {
    const examOnlyTopics = new Set(dashboardMeta.topics.filter((item) => item.examOnly).map((item) => item.title));
    pool = pool.filter((item) => !examOnlyTopics.has(item.topic));
  }

  if (questionType) {
    pool = pool.filter((item) => item.type === questionType);
  }

  const basePool = pool;
  let profileReviews: Map<string, ProfileReviewState> | null = null;
  if (mode === "hardOnly" || mode === "review") {
    const reviewItems = await prisma.attemptItem.findMany({
      where: { attempt: { profileId } },
      orderBy: { createdAt: "asc" },
      select: { questionId: true, difficulty: true, isCorrect: true, createdAt: true },
    });
    profileReviews = replayProfileReviews(reviewItems);
  }

  if (mode === "mistakes") {
    const mistakeItems = await prisma.attemptItem.findMany({
      where: {
        isCorrect: false,
        attempt: {
          profileId,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
      select: {
        questionId: true,
      },
    });
    const ids = new Set(mistakeItems.map((item) => item.questionId));
    pool = pool.filter((question) => ids.has(question.id));
  }

  if (mode === "hardOnly") {
    pool = pool.filter((question) => {
      return question.difficulty === "hard" || (profileReviews?.get(question.id)?.mastery ?? 1) < 0.45;
    });
  }

  if (mode === "review") {
    const now = new Date();
    pool = pool.filter((question) => {
      const review = profileReviews?.get(question.id);
      return Boolean(review && (review.nextReviewAt <= now || review.mastery < 0.7));
    });
  }

  if (mode === "exam") {
    if (subject === "english") {
      const chosen: typeof pool = [];
      const uniqueness = createQuestionUniquenessState();
      if (selectedExamOnlyTopic) return shuffle(pool, `${selectionSeed}:english:exam-only`).slice(0, count);
      const newTenseTopics = new Set(dashboardMeta.topics.filter((item) => item.key.startsWith("english-tense")).map((item) => item.title));
      pool = pool.filter((question) => !newTenseTopics.has(question.topic));
      const byCategory = (category: string) => shuffle(
        pool.filter((question) => question.meta && (question.meta as Record<string, unknown>).englishCategory === category),
        `${selectionSeed}:english:${category}`,
      );
      appendSemanticQuestions(chosen, byCategory("vocabulary"), 10, uniqueness);
      appendSemanticQuestions(chosen, byCategory("grammar"), 20, uniqueness);
      appendSemanticQuestions(chosen, byCategory("matching"), 24, uniqueness);
      appendSemanticQuestions(chosen, byCategory("sequence"), 25, uniqueness);
      return shuffle(chosen, `${selectionSeed}:english:final`);
    }
    const byDifficulty = {
      easy: shuffle(
        pool.filter((question) => question.difficulty === "easy"),
        `${selectionSeed}:exam:easy`,
      ),
      medium: shuffle(
        pool.filter((question) => question.difficulty === "medium"),
        `${selectionSeed}:exam:medium`,
      ),
      hard: shuffle(
        pool.filter((question) => question.difficulty === "hard"),
        `${selectionSeed}:exam:hard`,
      ),
    };

    const chosen: typeof pool = [];
    const uniqueness = createQuestionUniquenessState();
    appendSemanticQuestions(chosen, byDifficulty.easy, 9, uniqueness);
    appendSemanticQuestions(chosen, byDifficulty.medium, 24, uniqueness);
    appendSemanticQuestions(chosen, byDifficulty.hard, 30, uniqueness);
    appendSemanticQuestions(chosen, shuffle(pool, `${selectionSeed}:exam:fallback`), 30, uniqueness);
    return shuffle(chosen, `${selectionSeed}:exam:final`);
  }

  if (pool.length === 0 && mode !== "review") {
    pool = basePool;
  }

  const sizedPool = [...pool];
  const sorted = sizedPool.sort((a, b) => weightQuestion(b as never, selectionSeed) - weightQuestion(a as never, selectionSeed));
  const maxCount = Math.min(count, sorted.length);
  if (lessonIndex !== undefined && mode === "topic") {
    return selectNashelingoLevel(sorted, maxCount, lessonIndex, selectionSeed);
  }
  const selected: typeof sorted = [];
  appendSemanticQuestions(selected, sorted, maxCount, createQuestionUniquenessState());
  return shuffle(selected, `${selectionSeed}:picked`);
};

const gradeByPercent = (percent: number) => {
  if (percent >= 90) return "5";
  if (percent >= 75) return "4";
  if (percent >= 50) return "3";
  return "2";
};

const computeXp = (results: Array<{ isCorrect: boolean; difficulty: string }>) =>
  results.reduce((sum, result) => {
    if (!result.isCorrect) return sum;
    if (result.difficulty === "hard") return sum + 25;
    if (result.difficulty === "medium") return sum + 15;
    return sum + 10;
  }, 0);

const updateProfileProgress = async (profileId: string, xpGained: number) => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    throw new Error("Profile not found");
  }

  const now = new Date();
  const today = formatDateKey(now);
  const yesterday = formatDateKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const lastActive = profile.lastActiveAt ? formatDateKey(profile.lastActiveAt) : null;
  const streak = lastActive === today ? profile.streak : lastActive === yesterday ? profile.streak + 1 : 1;
  const xp = profile.xp + xpGained;
  const level = getLevel(xp);

  const updated = await prisma.profile.update({
    where: { id: profileId },
    data: {
      xp,
      level,
      streak,
      bestStreak: Math.max(profile.bestStreak, streak),
      lastActiveAt: now,
    },
  });

  return updated;
};

const updateActivity = async (profileId: string, correctCount: number, xpGained: number, durationMs: number) => {
  const date = formatDateKey(new Date());
  await prisma.activityDay.upsert({
    where: {
      profileId_date: {
        profileId,
        date,
      },
    },
    create: {
      profileId,
      date,
      attempts: 1,
      correct: correctCount,
      xp: xpGained,
    },
    update: {
      attempts: {
        increment: 1,
      },
      correct: {
        increment: correctCount,
      },
      xp: {
        increment: xpGained,
      },
    },
  });
};

const updateQuestionReview = async (question: Question, isCorrect: boolean) => {
  const review = await prisma.questionReview.upsert({
    where: { questionId: question.id },
    create: {
      questionId: question.id,
      timesAnswered: 0,
      correctCount: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      mastery: 0,
      nextReviewAt: new Date(0),
    },
    update: {},
  });

  const timesAnswered = review.timesAnswered + 1;
  const correctCount = review.correctCount + (isCorrect ? 1 : 0);
  const accuracy = correctCount / timesAnswered;
  const easeFactor = clamp(review.easeFactor + (isCorrect ? 0.08 : -0.18), 1.3, 3);
  const intervalDays = isCorrect ? Math.max(1, Math.round((review.intervalDays || 1) * easeFactor)) : 1;
  const nextReviewAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

  await prisma.questionReview.update({
    where: { questionId: question.id },
    data: {
      timesAnswered,
      correctCount,
      lastAnsweredAt: new Date(),
      easeFactor,
      intervalDays,
      nextReviewAt,
      mastery: clamp(isCorrect ? review.mastery + (question.difficulty === "hard" ? 0.08 : 0.12) : review.mastery - 0.14, 0, 1),
    },
  });
};

const getRecommendations = async (profileId: string) => {
  const wrongTopics = await prisma.attemptItem.findMany({
    where: {
      attempt: { profileId },
      isCorrect: false,
    },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      topic: true,
    },
  });

  const topicCounts = new Map<string, number>();
  for (const row of wrongTopics) {
    topicCounts.set(row.topic, (topicCounts.get(row.topic) ?? 0) + 1);
  }

  return [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
};

const toJsonQuestion = (question: unknown) => sanitizeQuestionText(question as Question);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Exam Prep API" });
});

app.get("/api/meta", async (req, res) => {
  const profileName = String(req.query.profileName ?? "Гость");
  const profile = await ensureProfile(profileName);
  const [stats, leaderboard, activity, topicProgress, theoryProgress, attempts, achievements] = await Promise.all([
    getProfileStats(profile.id),
    buildLeaderboard(),
    buildActivity(profile.id),
    buildTopicProgress(),
    prisma.nashelingoTheoryProgress.findMany({
      where: { profileId: profile.id },
      select: { subject: true, topic: true, completedAt: true },
    }),
    prisma.attempt.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 500,
      include: { items: true },
    }),
    prisma.profileAchievement.findMany({
      where: { profileId: profile.id },
      orderBy: { unlockedAt: "desc" },
    }),
  ]);

  const nashelingoLevelProgress = new Map<string, NashelingoLevelProgress>();
  attempts.forEach((attempt) => {
    const match = attempt.mode === "topic" ? attempt.topic?.match(/^(.*)::nashelingo:([0-4])$/u) : null;
    if (!match || attempt.count !== 6) return;
    const topic = topicCatalog.find((item) => item.title === match[1]);
    const correctCount = attempt.items.filter((item) => item.isCorrect).length;
    if (!topic?.subject || correctCount < 4) return;
    const entry: NashelingoLevelProgress = {
      subject: topic.subject,
      topic: match[1],
      level: Number(match[2]),
      correctCount,
      completedAt: attempt.createdAt.toISOString(),
    };
    const key = `${entry.subject}:${entry.topic}:${entry.level}`;
    const current = nashelingoLevelProgress.get(key);
    if (!current || entry.correctCount > current.correctCount || (entry.correctCount === current.correctCount && entry.completedAt > current.completedAt)) {
      nashelingoLevelProgress.set(key, entry);
    }
  });

  res.json({
    ...dashboardMeta,
    profile: toProfile(profile),
    stats,
    leaderboard,
    activity,
    topicProgress,
    theoryProgress: theoryProgress.map((entry) => ({
      subject: entry.subject as SubjectId,
      topic: entry.topic,
      completedAt: entry.completedAt.toISOString(),
    })),
    nashelingoLevelProgress: [...nashelingoLevelProgress.values()],
    attempts,
    achievements,
    questionBank: buildQuestionBankSummary(),
  });
});

app.post("/api/nashelingo/theory/complete", async (req, res) => {
  const body = req.body as { profileName?: string; subject?: SubjectId; topic?: string };
  const subject = body.subject;
  const topic = body.topic?.trim();
  const validSubject = subject === "it-design" || subject === "management" || subject === "economics" || subject === "english";
  const validTopic = validSubject
    && topic
    && topicCatalog.some((entry) => entry.subject === subject && entry.title === topic && !entry.examOnly);

  if (!validTopic || !subject || !topic) {
    return res.status(400).send("Unknown Nashelingo topic");
  }

  const profile = await ensureProfile(body.profileName);
  const progress = await prisma.nashelingoTheoryProgress.upsert({
    where: { profileId_subject_topic: { profileId: profile.id, subject, topic } },
    create: { profileId: profile.id, subject, topic },
    update: {},
    select: { subject: true, topic: true, completedAt: true },
  });

  return res.json({
    subject: progress.subject as SubjectId,
    topic: progress.topic,
    completedAt: progress.completedAt.toISOString(),
  });
});

app.get("/api/questions", async (req, res) => {
  const topic = req.query.topic ? String(req.query.topic) : undefined;
  const difficulty = req.query.difficulty ? String(req.query.difficulty) : undefined;
  const search = req.query.search ? String(req.query.search).toLowerCase() : undefined;

  const questions = await prisma.question.findMany({
    include: { reviews: true },
    orderBy: { id: "asc" },
  });

  const filtered = questions.map(toJsonQuestion).filter((question) => {
    if (topic && question.topic !== topic) return false;
    if (difficulty && question.difficulty !== difficulty) return false;
    if (search && !question.question.toLowerCase().includes(search) && !question.tags.some((tag) => String(tag).toLowerCase().includes(search))) {
      return false;
    }
    return true;
  });

  res.json(filtered);
});

app.post("/api/questions", async (req, res) => {
  const payload = req.body as Question;
  if (!payload?.id || !payload?.topic || !payload?.question) {
    return res.status(400).json({ error: "Invalid question payload" });
  }

  const created = await prisma.question.create({
    data: {
      id: payload.id,
      topic: payload.topic,
      difficulty: payload.difficulty,
      type: payload.type,
      question: payload.question,
      options: payload.options as never,
      correct: payload.correct as never,
      explanation: payload.explanation,
      source: payload.source,
      tags: payload.tags as never,
      meta: (payload.meta ?? null) as never,
    },
  });

  await prisma.questionReview.create({
    data: {
      questionId: created.id,
      timesAnswered: 0,
      correctCount: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      mastery: 0,
      nextReviewAt: new Date(0),
    },
  });

  res.status(201).json(created);
});

app.put("/api/questions/:id", async (req, res) => {
  const id = req.params.id;
  const payload = req.body as Partial<Question>;
  const updated = await prisma.question.update({
    where: { id },
    data: {
      topic: payload.topic,
      difficulty: payload.difficulty,
      type: payload.type,
      question: payload.question,
      options: payload.options as never,
      correct: payload.correct as never,
      explanation: payload.explanation,
      source: payload.source,
      tags: payload.tags as never,
      meta: payload.meta as never,
    },
  });

  res.json(updated);
});

app.delete("/api/questions/:id", async (req, res) => {
  const id = req.params.id;
  await prisma.question.delete({ where: { id } });
  res.json({ ok: true });
});

app.post("/api/questions/import", async (req, res) => {
  const payload = req.body as Question[] | { questions?: Question[] };
  const questions = Array.isArray(payload) ? payload : payload.questions ?? [];
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: "No questions provided" });
  }

  await prisma.$transaction([
    ...questions.flatMap((question) => [
      prisma.question.upsert({
        where: { id: question.id },
        create: {
          id: question.id,
          topic: question.topic,
          difficulty: question.difficulty,
          type: question.type,
          question: question.question,
          options: question.options as never,
          correct: question.correct as never,
          explanation: question.explanation,
          source: question.source,
          tags: question.tags as never,
          meta: (question.meta ?? null) as never,
        },
        update: {
          topic: question.topic,
          difficulty: question.difficulty,
          type: question.type,
          question: question.question,
          options: question.options as never,
          correct: question.correct as never,
          explanation: question.explanation,
          source: question.source,
          tags: question.tags as never,
          meta: (question.meta ?? null) as never,
        },
      }),
      prisma.questionReview.upsert({
        where: { questionId: question.id },
        create: {
          questionId: question.id,
          timesAnswered: 0,
          correctCount: 0,
          easeFactor: 2.5,
          intervalDays: 0,
          mastery: 0,
          nextReviewAt: new Date(0),
        },
        update: {},
      }),
    ]),
  ]);

  res.json({ imported: questions.length });
});

app.get("/api/questions/export", async (_req, res) => {
  const questions = await prisma.question.findMany({
    orderBy: { id: "asc" },
  });
  res.json(questions);
});

app.post("/api/tests/generate", async (req, res) => {
  const body = req.body as {
    profileName?: string;
    mode?: string;
    count?: number;
    topic?: string | null;
    topics?: string[];
    subject?: SubjectId;
    questionType?: Question["type"];
    lessonIndex?: number;
  };

  const profile = await ensureProfile(body.profileName);
  const count = body.mode === "exam" ? 30 : Math.max(1, Math.min(body.count ?? 10, 100));
  const questions = await selectQuestions({
    profileId: profile.id,
    mode: body.mode ?? "practice",
    count,
    topic: body.topic ?? null,
    topics: body.topics?.filter(Boolean),
    subject: body.subject,
    questionType: body.questionType,
    lessonIndex: body.lessonIndex,
  });

  const test: GeneratedTest = {
    id: nanoid(),
    title:
      body.mode === "exam"
        ? "Экзамен"
        : body.topic
          ? `${body.topic}`
          : body.mode === "hardOnly"
            ? "Только сложные"
            : body.mode === "mistakes"
              ? "Только мои ошибки"
              : body.mode === "review"
                ? "Повторение"
                : "Практика",
    mode: body.mode ?? "practice",
    topic: body.topic ?? null,
    questions: questions.map((question) => ({
      ...toJsonQuestion(question),
      scoreWeight: body.mode === "exam" && body.subject === "english"
        ? (question.meta as Record<string, unknown> | null)?.englishCategory === "vocabulary" ? 2
          : (question.meta as Record<string, unknown> | null)?.englishCategory === "grammar" ? 4
            : 8
        : question.difficulty === "hard" ? 3 : question.difficulty === "medium" ? 2 : 1,
    })),
  };

  res.json(test);
});

app.post("/api/tests/submit", async (req, res) => {
  const body = req.body as AttemptSubmission;
  const hasAnswer = (answer: unknown) => {
    if (answer === undefined || answer === null) return false;
    if (typeof answer === "string") return answer.trim().length > 0;
    if (Array.isArray(answer)) return answer.length > 0;
    return true;
  };
  const submittedAnswers = body.answers.filter((entry) => hasAnswer(entry.answer));
  const testModes = new Set(["practice", "exam", "hardOnly", "mistakes", "topic", "random", "review"]);
  const answersToEvaluate = testModes.has(String(body.mode)) && submittedAnswers.length < body.count ? [] : submittedAnswers;
  const profile = await ensureProfile(body.profileName);
  const snapshotQuestions = body.questionSnapshot?.filter((question) =>
    typeof question?.id === "string" && answersToEvaluate.some((entry) => entry.questionId === question.id)) ?? [];
  const storedQuestions = snapshotQuestions.length ? [] : await prisma.question.findMany({
    where: {
      id: {
        in: answersToEvaluate.map((entry) => entry.questionId),
      },
    },
  });
  const questionMap = new Map<string, Question>(snapshotQuestions.length
    ? snapshotQuestions.map((question) => [question.id, sanitizeQuestionText(question)])
    : storedQuestions.map((question) => [question.id, toJsonQuestion(question)]));
  const results: AttemptResult[] = answersToEvaluate.flatMap((entry) => {
    const question = questionMap.get(entry.questionId);
    if (!question) {
      return [];
    }
    const evaluation = evaluateQuestion(question, entry.answer);
    return [{
      questionId: question.id,
      question: question.question,
      topic: question.topic,
      difficulty: question.difficulty,
      type: question.type,
      isCorrect: evaluation.isCorrect,
      userAnswer: getUserAnswerPreview(question, entry.answer),
      correctAnswer: getCorrectAnswerPreview(question),
      explanation: question.explanation,
      whyWrong: evaluation.whyWrong,
    } satisfies AttemptResult];
  });

  const examWeight = (questionId: string) => {
    const category = (questionMap.get(questionId)?.meta as Record<string, unknown> | undefined)?.englishCategory;
    return category === "vocabulary" ? 2 : category === "grammar" ? 4 : category === "matching" || category === "sequence" ? 8 : 1;
  };
  const isEnglishExam = body.mode === "exam" && results.every((result) => (questionMap.get(result.questionId)?.meta as Record<string, unknown> | undefined)?.englishCategory);
  const score = isEnglishExam ? results.reduce((sum, result) => sum + (result.isCorrect ? examWeight(result.questionId) : 0), 0) : results.filter((result) => result.isCorrect).length;
  const maxScore = isEnglishExam ? results.reduce((sum, result) => sum + examWeight(result.questionId), 0) : results.length;
  const percent = maxScore === 0 ? 0 : Math.round((score / maxScore) * 1000) / 10;
  const grade = gradeByPercent(percent);
  const xpGained = computeXp(results);
  const durationMs = body.durationMs;
  const correctCount = results.filter((result) => result.isCorrect).length;
  const wrongCount = results.length - correctCount;
  const attemptId = nanoid();

  if (results.length === 0) {
    return res.json({
      attemptId: "", score: 0, maxScore: 0, percent: 0, grade: "—", xpGained: 0,
      level: profile.level, streak: profile.streak, bestStreak: profile.bestStreak, correctCount: 0, wrongCount: 0,
      durationMs, results: [], recommendations: [], achievements: [],
    } satisfies SubmissionResponse);
  }

  await prisma.attempt.create({
    data: {
      id: attemptId,
      profileId: profile.id,
      mode: body.mode,
      count: maxScore,
      score,
      maxScore,
      percent,
      grade,
      durationMs,
      topic: body.topic ?? null,
      items: {
        create: results.map((result) => ({
          questionId: result.questionId,
          topic: result.topic,
          difficulty: result.difficulty,
          isCorrect: result.isCorrect,
          userAnswer: result.userAnswer as never,
          correctAnswer: result.correctAnswer as never,
          explanation: result.explanation,
        })),
      },
    },
  });

  await Promise.all(
    results.map((result) =>
      updateQuestionReview(questionMap.get(result.questionId)!, result.isCorrect),
    ),
  );

  await updateProfileProgress(profile.id, xpGained);
  await updateActivity(profile.id, correctCount, xpGained, durationMs);

  const unlocked = await buildAchievements(profile.id);
  const recommendations = await getRecommendations(profile.id);
  const updatedProfile = await prisma.profile.findUnique({ where: { id: profile.id } });

  const response: SubmissionResponse = {
    attemptId,
    score,
    maxScore,
    percent,
    grade,
    xpGained,
    level: updatedProfile?.level ?? 1,
    streak: updatedProfile?.streak ?? 0,
    bestStreak: updatedProfile?.bestStreak ?? 0,
    correctCount,
    wrongCount,
    durationMs,
    results,
    recommendations,
    achievements: unlocked,
  };

  res.json(response);
});

app.get("/api/ranking", async (_req, res) => {
  res.json(await buildLeaderboard());
});

app.get("/api/reviews", async (req, res) => {
  const profileName = String(req.query.profileName ?? "Гость");
  const profile = await ensureProfile(profileName);
  const items = await prisma.attemptItem.findMany({
    where: { attempt: { profileId: profile.id } },
    include: { question: true },
    orderBy: { createdAt: "asc" },
  });
  const states = replayProfileReviews(items);
  const latestItems = new Map<string, (typeof items)[number]>();
  items.forEach((item) => latestItems.set(item.questionId, item));
  const reviews = [...latestItems.values()]
    .map((item) => ({ item, state: states.get(item.questionId)! }))
    .sort((left, right) => left.state.mastery - right.state.mastery || right.item.createdAt.getTime() - left.item.createdAt.getTime());

  res.json(
    reviews.map(({ item, state }) => ({
      questionId: item.questionId,
      topic: item.question.topic,
      difficulty: item.question.difficulty,
      question: item.question.question,
      mastery: state.mastery,
      accuracy: state.timesAnswered === 0 ? 0 : Math.round((state.correctCount / state.timesAnswered) * 1000) / 10,
      timesAnswered: state.timesAnswered,
      correctCount: state.correctCount,
      lastAnsweredAt: item.createdAt.toISOString(),
      nextReviewAt: state.nextReviewAt.toISOString(),
      options: item.question.options,
    })),
  );
});

app.get("/api/profile", async (req, res) => {
  const profile = await ensureProfile(String(req.query.profileName ?? "Гость"));
  const stats = await getProfileStats(profile.id);
  res.json({
    profile: toProfile(profile),
    stats,
  });
});

const clientDist = path.resolve(__dirname, "../dist/client");
app.use(express.static(clientDist));

app.get("/{*splat}", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }
  if (req.accepts("html")) {
    res.sendFile(path.join(clientDist, "index.html"));
    return;
  }
  next();
});

export default app;

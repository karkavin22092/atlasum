import questionData from "../../data/questions.json";
import { dashboardMeta } from "@server/content";
import { ADMIN_USERNAME } from "./permissions";
import { hasAnswer } from "./answers";
import { isDeletedAccountName } from "./deleted-accounts";
import { hasLegacyQuestionMetadata, sanitizeQuestionText } from "@shared/question-text";
import type {
  AttemptResult,
  AttemptSubmission,
  FillQuestion,
  GeneratedTest,
  MatchingItem,
  Profile,
  ProfileStats,
  Question,
  QuestionType,
  SubjectId,
  SequenceQuestion,
  SubmissionResponse,
} from "@shared/types";

type ReviewRecord = {
  timesAnswered: number;
  correctCount: number;
  lastAnsweredAt: string | null;
  nextReviewAt: string | null;
  intervalDays: number;
  easeFactor: number;
  mastery: number;
};

type StoredAttempt = {
  id: string;
  mode: string;
  count: number;
  score: number;
  maxScore: number;
  percent: number;
  grade: string;
  durationMs: number;
  topic: string | null;
  createdAt: string;
  items: AttemptResult[];
};

type StoredProfile = Profile & {
  reviews: Record<string, ReviewRecord>;
  attempts: StoredAttempt[];
  activity: Record<string, { attempts: number; correct: number; xp: number }>;
};

type LocalDatabase = {
  profiles: Record<string, StoredProfile>;
  overrides: Record<string, Question>;
  deletedQuestionIds: string[];
};

type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
  streak: number;
  bestStreak: number;
  attempts: number;
  accuracy: number;
  lastActiveAt: string | null;
  lastSeenAt: string | null;
};

const STORAGE_KEY = "design-tests-database-v3";
const baseQuestions = questionData as unknown as Question[];

const emptyDatabase = (): LocalDatabase => ({ profiles: {}, overrides: {}, deletedQuestionIds: [] });

const xpForResult = (result: AttemptResult) => {
  if (!result.isCorrect) return 0;
  if (result.difficulty === "hard") return 25;
  if (result.difficulty === "medium") return 15;
  return 10;
};

const rebuildProfileProgress = (profile: StoredProfile) => {
  const attempts = profile.attempts.slice().sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const reviews: Record<string, ReviewRecord> = {};
  const activity: StoredProfile["activity"] = {};
  let xp = 0;
  let coins = 0;

  attempts.forEach((attempt) => {
    const attemptXp = attempt.items.reduce((sum, result) => sum + xpForResult(result), 0);
    xp += attemptXp;
    coins += Math.max(1, Math.round(attempt.score * 1.5 + attempt.percent / 10));
    const date = attempt.createdAt.slice(0, 10);
    const day = activity[date] ?? { attempts: 0, correct: 0, xp: 0 };
    activity[date] = { attempts: day.attempts + 1, correct: day.correct + attempt.score, xp: day.xp + attemptXp };

    attempt.items.forEach((result) => {
      const current = reviews[result.questionId] ?? {
        timesAnswered: 0, correctCount: 0, lastAnsweredAt: null, nextReviewAt: null, intervalDays: 0, easeFactor: 2.5, mastery: 0,
      };
      const easeFactor = Math.min(3, Math.max(1.3, current.easeFactor + (result.isCorrect ? 0.08 : -0.18)));
      const intervalDays = result.isCorrect ? Math.max(1, Math.round((current.intervalDays || 1) * easeFactor)) : 1;
      const answeredAt = new Date(attempt.createdAt);
      reviews[result.questionId] = {
        timesAnswered: current.timesAnswered + 1,
        correctCount: current.correctCount + (result.isCorrect ? 1 : 0),
        lastAnsweredAt: attempt.createdAt,
        nextReviewAt: new Date(answeredAt.getTime() + intervalDays * 86_400_000).toISOString(),
        intervalDays,
        easeFactor,
        mastery: Math.min(1, Math.max(0, current.mastery + (result.isCorrect ? (result.difficulty === "hard" ? 0.08 : 0.12) : -0.14))),
      };
    });
  });

  const activeDates = Object.keys(activity).sort();
  let bestStreak = 0;
  let runningStreak = 0;
  let previousTime: number | null = null;
  activeDates.forEach((date) => {
    const currentTime = new Date(`${date}T00:00:00.000Z`).getTime();
    runningStreak = previousTime !== null && currentTime - previousTime === 86_400_000 ? runningStreak + 1 : 1;
    bestStreak = Math.max(bestStreak, runningStreak);
    previousTime = currentTime;
  });

  profile.reviews = reviews;
  profile.activity = activity;
  profile.xp = xp;
  profile.coins = coins;
  profile.level = Math.floor(xp / 250) + 1;
  profile.streak = activeDates.length ? runningStreak : 0;
  profile.bestStreak = bestStreak;
  profile.lastActiveAt = attempts.at(-1)?.createdAt ?? null;
};

const removeCorruptedAttempts = (database: LocalDatabase) => {
  let changed = false;
  Object.values(database.profiles).forEach((profile) => {
    const attempts = Array.isArray(profile.attempts) ? profile.attempts : [];
    const validAttempts = attempts.filter((attempt) =>
      Array.isArray(attempt.items) && attempt.items.length > 0 && attempt.items.every((item) => hasAnswer(item.userAnswer)));
    if (validAttempts.length === attempts.length) return;
    profile.attempts = validAttempts;
    rebuildProfileProgress(profile);
    changed = true;
  });
  return changed;
};

const removeDeletedProfiles = (database: LocalDatabase) => {
  const deletedIds = Object.entries(database.profiles)
    .filter(([id, profile]) => isDeletedAccountName(id) || isDeletedAccountName(profile.name))
    .map(([id]) => id);
  deletedIds.forEach((id) => delete database.profiles[id]);
  return deletedIds.length > 0;
};

const removeLegacyBuiltInOverrides = (database: LocalDatabase) => {
  const builtInIds = new Set(baseQuestions.map((question) => question.id));
  const staleIds = Object.entries(database.overrides)
    .filter(([id, question]) => builtInIds.has(id) && hasLegacyQuestionMetadata(question.question))
    .map(([id]) => id);
  staleIds.forEach((id) => delete database.overrides[id]);
  return staleIds.length > 0;
};

const readDatabase = (): LocalDatabase => {
  if (typeof window === "undefined") return emptyDatabase();
  try {
    const database = { ...emptyDatabase(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") } as LocalDatabase;
    const deletedProfiles = removeDeletedProfiles(database);
    const removedAttempts = removeCorruptedAttempts(database);
    const removedLegacyQuestions = removeLegacyBuiltInOverrides(database);
    const changed = deletedProfiles || removedAttempts || removedLegacyQuestions;
    if (changed) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    return database;
  } catch {
    return emptyDatabase();
  }
};

const writeDatabase = (database: LocalDatabase) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  window.dispatchEvent(new Event("design-tests-data-updated"));
};

const assertAdminSession = () => {
  try {
    const sessionId = window.localStorage.getItem("design-tests-session-v1");
    const users = JSON.parse(window.localStorage.getItem("design-tests-users-v1") ?? "[]") as Array<{ id?: string; name?: string }>;
    const activeUser = users.find((user) => user.id === sessionId);
    if (activeUser?.name?.trim().toLowerCase() === ADMIN_USERNAME) return;
  } catch {
    // The common error below keeps permission failures consistent.
  }
  throw new Error("Недостаточно прав для управления базой вопросов");
};

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-zа-я0-9]+/giu, "-").replace(/^-+|-+$/g, "") || "guest";

const ensureProfile = (database: LocalDatabase, profileName?: string) => {
  const name = profileName?.trim() || "Гость";
  const id = slugify(name);
  if (!database.profiles[id]) {
    database.profiles[id] = {
      id,
      name,
      xp: 0,
      coins: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      lastActiveAt: null,
      reviews: {},
      attempts: [],
      activity: {},
    };
  }
  database.profiles[id].name = name;
  return database.profiles[id];
};

const allQuestions = (database = readDatabase()) => {
  const deleted = new Set(database.deletedQuestionIds);
  const builtIn = baseQuestions
    .filter((question) => !deleted.has(question.id))
    .map((question) => sanitizeQuestionText(database.overrides[question.id] ?? question));
  const builtInIds = new Set(baseQuestions.map((question) => question.id));
  const custom = Object.values(database.overrides)
    .filter((question) => !builtInIds.has(question.id) && !deleted.has(question.id))
    .map(sanitizeQuestionText);
  return [...builtIn, ...custom];
};

const shuffle = <T,>(items: T[]) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
};

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/giu, "").trim();

const normalizeList = (answer: unknown) =>
  (Array.isArray(answer) ? answer : typeof answer === "string" ? answer.split(",") : [])
    .map(String)
    .map((value) => value.trim())
    .filter(Boolean)
    .sort();

const evaluateQuestion = (question: Question, answer: unknown) => {
  const reasons: Partial<Record<Question["type"], string>> = {
    matching: "Нужно сопоставить каждый термин с его точным определением.",
    sequence: "В этом задании важен порядок этапов. Восстановите процесс шаг за шагом.",
    fill: "Сверьте ключевой термин с формулировкой определения.",
    multiple: "Здесь несколько верных вариантов: необходимо отметить каждый подходящий ответ.",
  };
  const whyWrong = reasons[question.type] ?? "Выбранный вариант отличается от правильного по смыслу или ключевому термину.";

  if (["single", "scenario", "imageChoice"].includes(question.type)) {
    return { isCorrect: String(answer) === String(question.correct), whyWrong };
  }
  if (question.type === "trueFalse") {
    return { isCorrect: answer === question.correct, whyWrong };
  }
  if (question.type === "multiple") {
    const expected = normalizeList(question.correct);
    const received = normalizeList(answer);
    return { isCorrect: expected.length === received.length && expected.every((item, index) => item === received[index]), whyWrong };
  }
  if (question.type === "fill") {
    const correct = question.correct as FillQuestion;
    const acceptable = [correct.answer, ...(correct.acceptable ?? [])].map(normalizeText);
    return { isCorrect: acceptable.includes(normalizeText(String(answer ?? ""))), whyWrong };
  }
  if (question.type === "matching") {
    const received = (Array.isArray(answer) ? answer : []).map((item) => {
      const pair = item as { left?: string; right?: string };
      return `${pair.left ?? ""}::${pair.right ?? ""}`;
    }).sort();
    const expected = (question.correct as MatchingItem[]).map((item) => `${item.left}::${item.right}`).sort();
    return { isCorrect: expected.length === received.length && expected.every((item, index) => item === received[index]), whyWrong };
  }
  if (question.type === "sequence") {
    const received = (Array.isArray(answer) ? answer : []).map((item) => normalizeText(String(item)));
    const expected = (question.correct as SequenceQuestion).correctOrder.map(normalizeText);
    return { isCorrect: expected.length === received.length && expected.every((item, index) => item === received[index]), whyWrong };
  }
  return { isCorrect: false, whyWrong };
};

const correctAnswerPreview = (question: Question): unknown => {
  if (["single", "scenario", "imageChoice"].includes(question.type)) {
    return question.options.find((option) => option.id === question.correct)?.text ?? "";
  }
  if (question.type === "trueFalse") return question.correct ? "Верно" : "Неверно";
  if (question.type === "multiple") {
    return question.options.filter((option) => Array.isArray(question.correct) && question.correct.includes(option.id)).map((option) => option.text);
  }
  if (question.type === "fill") return (question.correct as FillQuestion).answer;
  if (question.type === "matching") return (question.correct as MatchingItem[]).map((pair) => `${pair.left} → ${pair.right}`);
  if (question.type === "sequence") return (question.correct as SequenceQuestion).correctOrder;
  return "";
};

const userAnswerPreview = (question: Question, answer: unknown): unknown => {
  if (answer === "__skipped__") return "Вопрос пропущен";
  if (answer === "__timeout__") return "Время вышло";
  if (["single", "scenario", "imageChoice"].includes(question.type)) {
    return question.options.find((option) => option.id === String(answer))?.text ?? String(answer ?? "");
  }
  if (question.type === "trueFalse") {
    return answer === true ? "Верно" : answer === false ? "Неверно" : "Нет ответа";
  }
  if (question.type === "multiple") {
    const selectedIds = Array.isArray(answer) ? answer.map(String) : [];
    return selectedIds.map((id) => question.options.find((option) => option.id === id)?.text ?? id);
  }
  if (question.type === "fill") return String(answer ?? "");
  if (question.type === "matching") {
    return Array.isArray(answer)
      ? answer.map((item) => {
          const pair = item as Partial<MatchingItem>;
          return `${pair.left ?? ""} → ${pair.right ?? ""}`;
        })
      : [];
  }
  if (question.type === "sequence") return Array.isArray(answer) ? answer.map(String) : [];
  return answer;
};

const weightedSample = (questions: Question[], profile: StoredProfile, count: number) =>
  questions
    .map((question) => {
      const review = profile.reviews[question.id];
      const difficultyWeight = question.difficulty === "hard" ? 2 : question.difficulty === "medium" ? 1.35 : 1;
      const masteryWeight = 1 + (1 - (review?.mastery ?? 0)) * 1.5;
      return { question, score: Math.pow(Math.random(), 1 / (difficultyWeight * masteryWeight)) };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, count)
    .map((entry) => entry.question);

const uniqueQuestionPool = (questions: Question[]) => {
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

const titleForMode = (mode: string, topic?: string | null) => {
  if (mode === "exam") return "Экзамен";
  if (topic) return topic;
  if (mode === "hardOnly") return "Только сложные";
  if (mode === "mistakes") return "Только мои ошибки";
  if (mode === "review") return "Повторение";
  return "Практика";
};

const getStats = (profile: StoredProfile): ProfileStats => {
  const totalQuestionsAnswered = profile.attempts.reduce((sum, attempt) => sum + attempt.maxScore, 0);
  const totalCorrect = profile.attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  const reviews = Object.values(profile.reviews);
  const now = Date.now();
  const levelStart = (profile.level - 1) * 250;
  const nextLevelXp = profile.level * 250;
  return {
    totalQuestionsAnswered,
    totalCorrect,
    accuracy: totalQuestionsAnswered ? Math.round((totalCorrect / totalQuestionsAnswered) * 1000) / 10 : 0,
    xpPerLevel: 250,
    nextLevelXp,
    levelProgress: Math.min(100, Math.max(0, ((profile.xp - levelStart) / 250) * 100)),
    reviewDue: reviews.filter((review) => !review.nextReviewAt || new Date(review.nextReviewAt).getTime() <= now).length,
    mastered: reviews.filter((review) => review.mastery >= 0.8).length,
    weak: reviews.filter((review) => review.timesAnswered > 0 && review.mastery < 0.45).length,
  };
};

const buildAchievements = (profile: StoredProfile) => {
  const stats = getStats(profile);
  const values = [
    { key: "first-test", title: "Первый шаг", description: "Завершить первый тест", icon: "Sparkles", unlocked: profile.attempts.length >= 1 },
    { key: "answers-100", title: "Сотня", description: "Ответить на 100 вопросов", icon: "Target", unlocked: stats.totalQuestionsAnswered >= 100 },
    { key: "accuracy-90", title: "Точно в цель", description: "Достичь точности 90%", icon: "Trophy", unlocked: stats.totalQuestionsAnswered >= 20 && stats.accuracy >= 90 },
    { key: "level-5", title: "Продвинутый", description: "Достичь 5 уровня", icon: "Medal", unlocked: profile.level >= 5 },
  ];
  return values.filter((item) => item.unlocked).map(({ unlocked: _unlocked, ...item }) => ({ ...item, unlockedAt: profile.lastActiveAt ?? new Date().toISOString() }));
};

const registeredProfileNames = () => {
  try {
    const users = JSON.parse(window.localStorage.getItem("design-tests-users-v1") ?? "[]") as Array<{ name?: string }>;
    return new Set(users.map((user) => user.name?.trim().toLowerCase()).filter((name): name is string => Boolean(name)));
  } catch {
    return new Set<string>();
  }
};

const registeredUsers = () => {
  try {
    return JSON.parse(window.localStorage.getItem("design-tests-users-v1") ?? "[]") as Array<{ id?: string; name?: string; avatarUrl?: string | null }>;
  } catch {
    return [] as Array<{ id?: string; name?: string; avatarUrl?: string | null }>;
  }
};

const buildLeaderboard = (database: LocalDatabase) => {
  const registeredNames = registeredProfileNames();
  const users = registeredUsers();
  return Object.values(database.profiles).filter((profile) => registeredNames.has(profile.name.trim().toLowerCase())).map((profile) => ({
    id: profile.id,
    name: profile.name,
    avatarUrl: users.find((user) => user.id === profile.id || user.name?.trim().toLowerCase() === profile.name.trim().toLowerCase())?.avatarUrl ?? null,
    xp: profile.xp,
    level: profile.level,
    streak: profile.streak,
    bestStreak: profile.bestStreak,
    attempts: profile.attempts.length,
    accuracy: getStats(profile).accuracy,
    lastActiveAt: profile.lastActiveAt,
    lastSeenAt: null,
  })).sort((left, right) => right.xp - left.xp).map((entry, index) => ({ ...entry, rank: index + 1 }));
};

const syncLeaderboard = async (localEntries: LeaderboardEntry[], activeProfileId?: string): Promise<LeaderboardEntry[]> => {
  if (typeof window === "undefined") return localEntries;
  const heartbeatAt = new Date().toISOString();
  const activeEntry = localEntries.find((entry) => entry.id === activeProfileId);
  const localWithPresence = localEntries.map((entry) => entry.id === activeProfileId ? { ...entry, lastSeenAt: heartbeatAt } : entry);
  try {
    const response = await fetch("/.netlify/functions/leaderboard", {
      method: activeEntry ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: activeEntry ? JSON.stringify({ ...activeEntry, lastSeenAt: heartbeatAt }) : undefined,
    });
    if (!response.ok) throw new Error("Shared leaderboard is unavailable");
    return await response.json() as LeaderboardEntry[];
  } catch {
    return localWithPresence;
  }
};

const updateReview = (profile: StoredProfile, question: Question, isCorrect: boolean) => {
  const current = profile.reviews[question.id] ?? {
    timesAnswered: 0, correctCount: 0, lastAnsweredAt: null, nextReviewAt: null, intervalDays: 0, easeFactor: 2.5, mastery: 0,
  };
  const easeFactor = Math.min(3, Math.max(1.3, current.easeFactor + (isCorrect ? 0.08 : -0.18)));
  const intervalDays = isCorrect ? Math.max(1, Math.round((current.intervalDays || 1) * easeFactor)) : 1;
  profile.reviews[question.id] = {
    timesAnswered: current.timesAnswered + 1,
    correctCount: current.correctCount + (isCorrect ? 1 : 0),
    lastAnsweredAt: new Date().toISOString(),
    nextReviewAt: new Date(Date.now() + intervalDays * 86_400_000).toISOString(),
    intervalDays,
    easeFactor,
    mastery: Math.min(1, Math.max(0, current.mastery + (isCorrect ? (question.difficulty === "hard" ? 0.08 : 0.12) : -0.14))),
  };
};

export const localApi = {
  async meta(profileName: string) {
    const database = readDatabase();
    const profile = ensureProfile(database, profileName);
    const questions = allQuestions(database);
    const topicProgress = dashboardMeta.topics.map((topic) => {
      const topicQuestions = questions.filter((question) => question.topic === topic.title);
      const reviews = topicQuestions.map((question) => profile.reviews[question.id]).filter(Boolean);
      return {
        ...topic,
        mastery: reviews.length ? Math.round((reviews.reduce((sum, review) => sum + review.mastery, 0) / reviews.length) * 100) : 0,
        answered: reviews.reduce((sum, review) => sum + review.timesAnswered, 0),
      };
    });
    writeDatabase(database);
    const leaderboard = await syncLeaderboard(buildLeaderboard(database), profile.id);
    const sharedProfile = leaderboard.find((entry) => entry.id === profile.id);
    if (sharedProfile && sharedProfile.xp > profile.xp) {
      profile.xp = sharedProfile.xp;
      profile.level = sharedProfile.level;
      profile.streak = sharedProfile.streak;
      profile.bestStreak = sharedProfile.bestStreak;
      profile.lastActiveAt = sharedProfile.lastActiveAt;
      writeDatabase(database);
    }
    return {
      ...dashboardMeta,
      profile,
      stats: getStats(profile),
      leaderboard,
      activity: Object.entries(profile.activity).sort(([left], [right]) => left.localeCompare(right)).map(([date, value]) => ({ date, ...value })),
      topicProgress,
      attempts: profile.attempts.slice().reverse().slice(0, 20),
      achievements: buildAchievements(profile),
      questionBank: {
        total: questions.length,
        topics: dashboardMeta.topics.map((topic) => ({ key: topic.key, title: topic.title, questions: questions.filter((question) => question.topic === topic.title).length })),
      },
    };
  },

  async generateTest(payload: { profileName: string; mode: string; count: number; topic?: string | null; subject?: SubjectId; questionType?: QuestionType }): Promise<GeneratedTest> {
    const database = readDatabase();
    const profile = ensureProfile(database, payload.profileName);
    const source = uniqueQuestionPool(allQuestions(database));
    const subjectTopics = payload.subject
      ? new Set(dashboardMeta.topics.filter((topic) => topic.subject === payload.subject).map((topic) => topic.title))
      : null;
    let pool = source.filter((question) => (!subjectTopics || subjectTopics.has(question.topic)) && (!payload.topic || question.topic === payload.topic));
    if (payload.questionType) pool = pool.filter((question) => question.type === payload.questionType);
    const basePool = pool;
    if (payload.mode === "mistakes") pool = pool.filter((question) => {
      const review = profile.reviews[question.id];
      return review && review.correctCount < review.timesAnswered;
    });
    if (payload.mode === "hardOnly") pool = pool.filter((question) => question.difficulty === "hard" || (profile.reviews[question.id]?.mastery ?? 1) < 0.45);
    if (payload.mode === "review") pool = pool.filter((question) => {
      const review = profile.reviews[question.id];
      return review && (!review.nextReviewAt || new Date(review.nextReviewAt).getTime() <= Date.now() || review.mastery < 0.7);
    });
    if (!pool.length) {
      pool = basePool;
    }

    let selected: Question[];
    if (payload.mode === "exam") {
      selected = shuffle([
        ...shuffle(pool.filter((question) => question.difficulty === "easy")).slice(0, 9),
        ...shuffle(pool.filter((question) => question.difficulty === "medium")).slice(0, 15),
        ...shuffle(pool.filter((question) => question.difficulty === "hard")).slice(0, 6),
      ]);
    } else {
      selected = weightedSample(pool, profile, Math.min(Math.max(1, payload.count), 100));
    }
    writeDatabase(database);
    return {
      id: crypto.randomUUID(),
      title: titleForMode(payload.mode, payload.topic),
      mode: payload.mode,
      topic: payload.topic,
      questions: selected.map((question) => ({ ...question, scoreWeight: question.difficulty === "hard" ? 3 : question.difficulty === "medium" ? 2 : 1 })),
    };
  },

  async submitTest(payload: AttemptSubmission): Promise<SubmissionResponse> {
    const database = readDatabase();
    const profile = ensureProfile(database, payload.profileName);
    const questions = new Map(allQuestions(database).map((question) => [question.id, question]));
    const submittedAnswers = payload.answers.filter((entry) => hasAnswer(entry.answer));
    const testModes = new Set(["practice", "exam", "hardOnly", "mistakes", "topic", "random", "review"]);
    const incompleteTest = testModes.has(String(payload.mode)) && submittedAnswers.length < payload.count;
    const results = (incompleteTest ? [] : submittedAnswers).flatMap((entry) => {
      const question = questions.get(entry.questionId);
      if (!question) return [];
      const evaluation = evaluateQuestion(question, entry.answer);
      return [{
        questionId: question.id, question: question.question, topic: question.topic, difficulty: question.difficulty, type: question.type,
        isCorrect: evaluation.isCorrect, userAnswer: userAnswerPreview(question, entry.answer), correctAnswer: correctAnswerPreview(question), explanation: question.explanation, whyWrong: evaluation.whyWrong,
      } satisfies AttemptResult];
    });
    const score = results.filter((result) => result.isCorrect).length;
    const maxScore = results.length;
    const percent = maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0;
    const grade = percent >= 90 ? "5" : percent >= 75 ? "4" : percent >= 50 ? "3" : "2";
    const xpGained = results.reduce((sum, result) => sum + (result.isCorrect ? result.difficulty === "hard" ? 25 : result.difficulty === "medium" ? 15 : 10 : 0), 0);
    const coinsGained = results.length ? Math.max(1, Math.round(score * 1.5 + percent / 10)) : 0;
    if (!results.length) {
      return {
        attemptId: "", score: 0, maxScore: 0, percent: 0, grade: "—", xpGained: 0, coinsGained: 0,
        level: profile.level, streak: profile.streak, bestStreak: profile.bestStreak, correctCount: 0, wrongCount: 0,
        durationMs: payload.durationMs, results: [], recommendations: [], achievements: [],
      };
    }
    results.forEach((result) => updateReview(profile, questions.get(result.questionId)!, result.isCorrect));

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
    const lastDate = profile.lastActiveAt?.slice(0, 10);
    profile.streak = lastDate === today ? Math.max(1, profile.streak) : lastDate === yesterday ? profile.streak + 1 : 1;
    profile.bestStreak = Math.max(profile.bestStreak, profile.streak);
    profile.xp += xpGained;
    profile.coins += coinsGained;
    profile.level = Math.floor(profile.xp / 250) + 1;
    profile.lastActiveAt = now.toISOString();
    const activity = profile.activity[today] ?? { attempts: 0, correct: 0, xp: 0 };
    profile.activity[today] = { attempts: activity.attempts + 1, correct: activity.correct + score, xp: activity.xp + xpGained };

    const attemptId = crypto.randomUUID();
    profile.attempts.push({ id: attemptId, mode: String(payload.mode), count: maxScore, score, maxScore, percent, grade, durationMs: payload.durationMs, topic: payload.topic ?? null, createdAt: now.toISOString(), items: results });
    const wrongTopics = results.filter((result) => !result.isCorrect).map((result) => result.topic);
    writeDatabase(database);
    return {
      attemptId, score, maxScore, percent, grade, xpGained, coinsGained, level: profile.level, streak: profile.streak, bestStreak: profile.bestStreak,
      correctCount: score, wrongCount: maxScore - score, durationMs: payload.durationMs, results,
      recommendations: [...new Set(wrongTopics)].slice(0, 5), achievements: buildAchievements(profile).map(({ unlockedAt: _unlockedAt, ...achievement }) => achievement),
    };
  },

  async questions(params?: { topic?: string; difficulty?: string; search?: string }) {
    let questions = allQuestions();
    if (params?.topic) questions = questions.filter((question) => question.topic === params.topic);
    if (params?.difficulty) questions = questions.filter((question) => question.difficulty === params.difficulty);
    if (params?.search) {
      const search = params.search.toLowerCase();
      questions = questions.filter((question) => `${question.question} ${question.tags.join(" ")}`.toLowerCase().includes(search));
    }
    return questions;
  },

  async exportQuestions() {
    assertAdminSession();
    return allQuestions();
  },
  async createQuestion(question: Question) {
    assertAdminSession();
    const database = readDatabase();
    database.overrides[question.id] = question;
    database.deletedQuestionIds = database.deletedQuestionIds.filter((id) => id !== question.id);
    writeDatabase(database);
    return question;
  },
  async updateQuestion(id: string, payload: Partial<Question>) {
    assertAdminSession();
    const database = readDatabase();
    const current = allQuestions(database).find((question) => question.id === id);
    if (!current) throw new Error("Вопрос не найден");
    const updated = { ...current, ...payload, id };
    database.overrides[id] = updated;
    writeDatabase(database);
    return updated;
  },
  async deleteQuestion(id: string) {
    assertAdminSession();
    const database = readDatabase();
    delete database.overrides[id];
    database.deletedQuestionIds = [...new Set([...database.deletedQuestionIds, id])];
    writeDatabase(database);
    return { ok: true };
  },
  async importQuestions(questions: Question[]) {
    assertAdminSession();
    const database = readDatabase();
    questions.forEach((question) => { database.overrides[question.id] = question; });
    database.deletedQuestionIds = database.deletedQuestionIds.filter((id) => !questions.some((question) => question.id === id));
    writeDatabase(database);
    return { imported: questions.length };
  },
  async ranking() { return syncLeaderboard(buildLeaderboard(readDatabase())); },
  async profile(profileName: string) {
    const database = readDatabase();
    const profile = ensureProfile(database, profileName);
    writeDatabase(database);
    return { profile, stats: getStats(profile) };
  },
  async reviews(profileName: string) {
    const database = readDatabase();
    const profile = ensureProfile(database, profileName);
    const questionMap = new Map(allQuestions(database).map((question) => [question.id, question]));
    return Object.entries(profile.reviews).map(([questionId, review]) => {
      const question = questionMap.get(questionId);
      return {
        questionId, topic: question?.topic ?? "", difficulty: question?.difficulty ?? "easy", question: question?.question ?? "Вопрос удалён",
        mastery: review.mastery, accuracy: review.timesAnswered ? Math.round((review.correctCount / review.timesAnswered) * 1000) / 10 : 0,
        timesAnswered: review.timesAnswered, correctCount: review.correctCount, lastAnsweredAt: review.lastAnsweredAt, nextReviewAt: review.nextReviewAt, options: question?.options ?? [],
      };
    }).sort((left, right) => left.mastery - right.mastery);
  },
};

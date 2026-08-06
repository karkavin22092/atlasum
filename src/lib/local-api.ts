import questionData from "../../data/questions.json";
import { dashboardMeta } from "@server/content";
import type {
  AttemptResult,
  AttemptSubmission,
  FillQuestion,
  GeneratedTest,
  MatchingItem,
  Profile,
  ProfileStats,
  Question,
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

const STORAGE_KEY = "design-tests-database-v3";
const baseQuestions = questionData as unknown as Question[];

const emptyDatabase = (): LocalDatabase => ({ profiles: {}, overrides: {}, deletedQuestionIds: [] });

const readDatabase = (): LocalDatabase => {
  if (typeof window === "undefined") return emptyDatabase();
  try {
    return { ...emptyDatabase(), ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") } as LocalDatabase;
  } catch {
    return emptyDatabase();
  }
};

const writeDatabase = (database: LocalDatabase) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
  window.dispatchEvent(new Event("design-tests-data-updated"));
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
    .map((question) => database.overrides[question.id] ?? question);
  const builtInIds = new Set(baseQuestions.map((question) => question.id));
  const custom = Object.values(database.overrides).filter((question) => !builtInIds.has(question.id) && !deleted.has(question.id));
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

const seedLeaders = [
  { id: "leader-alina", name: "Алина", xp: 2840, level: 12, streak: 9, bestStreak: 14, attempts: 31, accuracy: 91.4, lastActiveAt: null },
  { id: "leader-maksim", name: "Максим", xp: 2365, level: 10, streak: 6, bestStreak: 11, attempts: 27, accuracy: 87.8, lastActiveAt: null },
  { id: "leader-daria", name: "Дарья", xp: 1980, level: 8, streak: 4, bestStreak: 8, attempts: 22, accuracy: 84.6, lastActiveAt: null },
];

const buildLeaderboard = (database: LocalDatabase) => [
  ...seedLeaders,
  ...Object.values(database.profiles).filter((profile) => profile.name !== "Гость").map((profile) => ({
    id: profile.id,
    name: profile.name,
    xp: profile.xp,
    level: profile.level,
    streak: profile.streak,
    bestStreak: profile.bestStreak,
    attempts: profile.attempts.length,
    accuracy: getStats(profile).accuracy,
    lastActiveAt: profile.lastActiveAt,
  })),
].sort((left, right) => right.xp - left.xp).map((entry, index) => ({ ...entry, rank: index + 1 }));

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
    return {
      ...dashboardMeta,
      profile,
      stats: getStats(profile),
      leaderboard: buildLeaderboard(database),
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

  async generateTest(payload: { profileName: string; mode: string; count: number; topic?: string | null }): Promise<GeneratedTest> {
    const database = readDatabase();
    const profile = ensureProfile(database, payload.profileName);
    const source = allQuestions(database);
    let pool = payload.topic ? source.filter((question) => question.topic === payload.topic) : source;
    if (payload.mode === "mistakes") pool = pool.filter((question) => {
      const review = profile.reviews[question.id];
      return review && review.correctCount < review.timesAnswered;
    });
    if (payload.mode === "hardOnly") pool = pool.filter((question) => question.difficulty === "hard" || (profile.reviews[question.id]?.mastery ?? 1) < 0.45);
    if (payload.mode === "review") pool = pool.filter((question) => {
      const review = profile.reviews[question.id];
      return review && (!review.nextReviewAt || new Date(review.nextReviewAt).getTime() <= Date.now() || review.mastery < 0.7);
    });
    if (!pool.length) pool = payload.topic ? source.filter((question) => question.topic === payload.topic) : source;

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
    const results = payload.answers.flatMap((entry) => {
      const question = questions.get(entry.questionId);
      if (!question) return [];
      const evaluation = evaluateQuestion(question, entry.answer);
      return [{
        questionId: question.id, question: question.question, topic: question.topic, difficulty: question.difficulty, type: question.type,
        isCorrect: evaluation.isCorrect, userAnswer: entry.answer, correctAnswer: correctAnswerPreview(question), explanation: question.explanation, whyWrong: evaluation.whyWrong,
      } satisfies AttemptResult];
    });
    const score = results.filter((result) => result.isCorrect).length;
    const maxScore = results.length;
    const percent = maxScore ? Math.round((score / maxScore) * 1000) / 10 : 0;
    const grade = percent >= 90 ? "5" : percent >= 75 ? "4" : percent >= 50 ? "3" : "2";
    const xpGained = results.reduce((sum, result) => sum + (result.isCorrect ? result.difficulty === "hard" ? 25 : result.difficulty === "medium" ? 15 : 10 : 0), 0);
    const coinsGained = Math.max(1, Math.round(score * 1.5 + percent / 10));
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
    profile.attempts.push({ id: attemptId, mode: String(payload.mode), count: payload.count, score, maxScore, percent, grade, durationMs: payload.durationMs, topic: payload.topic ?? null, createdAt: now.toISOString(), items: results });
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

  async exportQuestions() { return allQuestions(); },
  async createQuestion(question: Question) {
    const database = readDatabase();
    database.overrides[question.id] = question;
    database.deletedQuestionIds = database.deletedQuestionIds.filter((id) => id !== question.id);
    writeDatabase(database);
    return question;
  },
  async updateQuestion(id: string, payload: Partial<Question>) {
    const database = readDatabase();
    const current = allQuestions(database).find((question) => question.id === id);
    if (!current) throw new Error("Вопрос не найден");
    const updated = { ...current, ...payload, id };
    database.overrides[id] = updated;
    writeDatabase(database);
    return updated;
  },
  async deleteQuestion(id: string) {
    const database = readDatabase();
    delete database.overrides[id];
    database.deletedQuestionIds = [...new Set([...database.deletedQuestionIds, id])];
    writeDatabase(database);
    return { ok: true };
  },
  async importQuestions(questions: Question[]) {
    const database = readDatabase();
    questions.forEach((question) => { database.overrides[question.id] = question; });
    database.deletedQuestionIds = database.deletedQuestionIds.filter((id) => !questions.some((question) => question.id === id));
    writeDatabase(database);
    return { imported: questions.length };
  },
  async ranking() { return buildLeaderboard(readDatabase()); },
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

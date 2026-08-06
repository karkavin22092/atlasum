export type Difficulty = "easy" | "medium" | "hard";
export type SubjectId = "it-design" | "management";

export type QuestionType =
  | "single"
  | "multiple"
  | "trueFalse"
  | "matching"
  | "sequence"
  | "fill"
  | "imageChoice"
  | "scenario";

export type QuizMode =
  | "practice"
  | "exam"
  | "hardOnly"
  | "mistakes"
  | "topic"
  | "random"
  | "review";

export type GameId =
  | "cards"
  | "speed"
  | "millionaire"
  | "wheel"
  | "matching"
  | "truth"
  | "puzzle"
  | "memory"
  | "timeline"
  | "blitz";

export type QuestionOption = {
  id: string;
  text: string;
  image?: string;
  isCorrect?: boolean;
};

export type MatchingItem = {
  left: string;
  right: string;
};

export type SequenceQuestion = {
  items: string[];
  correctOrder: string[];
};

export type FillQuestion = {
  prompt: string;
  answer: string;
  acceptable?: string[];
};

export type Question = {
  id: string;
  topic: string;
  difficulty: Difficulty;
  type: QuestionType;
  question: string;
  options: QuestionOption[];
  correct:
    | string
    | string[]
    | boolean
    | MatchingItem[]
    | SequenceQuestion
    | FillQuestion;
  explanation: string;
  source: string;
  tags: string[];
  media?: {
    kind: "image";
    src: string;
    alt: string;
  };
  meta?: Record<string, unknown>;
};

export type TestQuestion = Question & {
  scoreWeight: number;
};

export type Profile = {
  id: string;
  name: string;
  xp: number;
  coins: number;
  level: number;
  streak: number;
  bestStreak: number;
  lastActiveAt: string | null;
};

export type ProfileStats = {
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

export type TopicMeta = {
  key: string;
  title: string;
  description: string;
  source: string;
  color: string;
  subject?: SubjectId;
};

export type DashboardMeta = {
  topics: TopicMeta[];
  modes: Array<{ key: QuizMode; title: string; description: string }>;
  games: Array<{ key: GameId; title: string; description: string }>;
};

export type AttemptSubmission = {
  profileName: string;
  mode: QuizMode | GameId;
  count: number;
  durationMs: number;
  topic?: string | null;
  answers: Array<{
    questionId: string;
    answer: unknown;
  }>;
};

export type AttemptResult = {
  questionId: string;
  question: string;
  topic: string;
  difficulty: Difficulty;
  type: QuestionType;
  isCorrect: boolean;
  userAnswer: unknown;
  correctAnswer: unknown;
  explanation: string;
  whyWrong: string;
};

export type SubmissionResponse = {
  attemptId: string;
  score: number;
  maxScore: number;
  percent: number;
  grade: string;
  xpGained: number;
  coinsGained: number;
  level: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  wrongCount: number;
  durationMs: number;
  results: AttemptResult[];
  recommendations: string[];
  achievements: Array<{
    key: string;
    title: string;
    description: string;
    icon: string;
  }>;
};

export type GeneratedTest = {
  id: string;
  title: string;
  mode: string;
  topic?: string | null;
  questions: TestQuestion[];
};

export type QuestionReviewStat = {
  questionId: string;
  timesAnswered: number;
  correctCount: number;
  accuracy: number;
  lastAnsweredAt: string | null;
  nextReviewAt: string | null;
  mastery: number;
};

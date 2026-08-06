import React, { type ReactNode } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { useTheme } from "./lib/theme";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, LogOut, MessageCircle, MoonStar, SunMedium, Sparkles, Trophy } from "lucide-react";
import { HomePage } from "./pages/home";
import { PracticePage } from "./pages/practice";
import { GamesPage } from "./pages/games";
import { GameRunnerPage } from "./pages/game-runner";
import { AdminPage } from "./pages/admin";
import { ReviewPage } from "./pages/review";
import { AuthPage } from "./pages/auth";
import { LeaderboardPage } from "./pages/leaderboard";
import { MessagesPage } from "./pages/messages";
import { dashboardMeta } from "@server/content";
import type { DashboardMeta, Profile, ProfileStats } from "@shared/types";
import { useAuth } from "./lib/auth";
import { getUnreadMessageSummary } from "./lib/chat";

type AppMeta = DashboardMeta & {
  profile: Profile;
  stats: ProfileStats;
  leaderboard: Array<{
    rank: number;
    id: string;
    name: string;
    xp: number;
    level: number;
    streak: number;
    bestStreak: number;
    attempts: number;
    accuracy: number;
    lastActiveAt: string | null;
  }>;
  activity: Array<{ date: string; attempts: number; correct: number; xp: number }>;
  topicProgress: Array<{ key: string; title: string; description: string; source: string; color: string; mastery: number; answered: number }>;
  attempts: Array<{
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
    items: Array<{
      questionId: string;
      topic: string;
      difficulty: string;
      isCorrect: boolean;
      userAnswer: unknown;
      correctAnswer: unknown;
      explanation: string;
    }>;
  }>;
  achievements: Array<{ key: string; title: string; description: string; icon: string; unlockedAt: string }>;
  questionBank: { total: number; topics: Array<{ key: string; title: string; questions: number }> };
};

const fallbackMeta: AppMeta = {
  ...dashboardMeta,
  profile: {
    id: "local-user",
    name: "Гость",
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastActiveAt: null,
  },
  stats: {
    totalQuestionsAnswered: 0,
    totalCorrect: 0,
    accuracy: 0,
    xpPerLevel: 250,
    nextLevelXp: 250,
    levelProgress: 0,
    reviewDue: 0,
    mastered: 0,
    weak: 0,
  },
  leaderboard: [],
  activity: [],
  topicProgress: dashboardMeta.topics.map((topic) => ({
    ...topic,
    mastery: 0,
    answered: 0,
  })),
  attempts: [],
  achievements: [],
  questionBank: {
    total: dashboardMeta.topics.length * 60,
    topics: dashboardMeta.topics.map((topic) => ({
      key: topic.key,
      title: topic.title,
      questions: 60,
    })),
  },
};

const AppShell = ({ children }: { children: ReactNode }) => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const profileName = user?.name ?? "Гость";

  const metaQuery = useQuery({
    queryKey: ["meta", profileName],
    queryFn: () => api.meta(profileName),
    retry: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const meta = (metaQuery.data ?? fallbackMeta) as AppMeta;
  const unreadMessagesQuery = useQuery({
    queryKey: ["unread-messages", meta.profile.id],
    queryFn: () => getUnreadMessageSummary(meta.profile.id),
    enabled: Boolean(user && meta.profile.id !== "guest"),
    retry: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
  });
  const unreadMessageCount = unreadMessagesQuery.data?.count ?? 0;
  const unreadLabel = unreadMessageCount > 99 ? "99+" : String(unreadMessageCount);

  return (
    <div className="theme-shell min-h-screen text-slate-100">
      <div className="fixed inset-0 -z-10 soft-grid opacity-35" />
      <div className="theme-atmosphere fixed inset-0 -z-20" />

      <header className="theme-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 transition hover:opacity-90">
            <div className="theme-brand-mark flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200/80">
                Design tests
              </div>
              <div className="text-xs text-slate-400">Информационные технологии и компьютерная графика</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to="/messages" className="glass relative inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <MessageCircle className="h-4 w-4 text-cyan-300" />
                Сообщения
                {unreadMessageCount ? (
                  <span className="message-unread-badge inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none shadow-[0_0_14px_rgba(244,63,94,0.65)]">
                    {unreadLabel}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <Link to="/leaderboard" className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
              <Trophy className="h-4 w-4 text-amber-300" />
              Рейтинг
            </Link>
            {user ? (
              <div className="glass flex h-11 items-center gap-3 rounded-full pl-4 pr-2 text-sm">
                <span className="text-slate-300">{user.name}</span>
                <button type="button" onClick={logout} title="Выйти" className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <LogIn className="h-4 w-4" />
                Войти
              </Link>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
              aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
              className="glass inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-105"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Link to="/messages" aria-label={unreadMessageCount ? `Сообщения, новых: ${unreadMessageCount}` : "Сообщения"} className="glass relative inline-flex h-10 w-10 items-center justify-center rounded-full">
                <MessageCircle className="h-4 w-4 text-cyan-300" />
                {unreadMessageCount ? (
                  <span className="message-unread-badge absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-rose-500 px-1 text-[10px] font-bold leading-none shadow-[0_0_12px_rgba(244,63,94,0.7)]">
                    {unreadLabel}
                  </span>
                ) : null}
              </Link>
            ) : null}
            <Link to="/leaderboard" aria-label="Рейтинг" className="glass inline-flex h-10 w-10 items-center justify-center rounded-full">
              <Trophy className="h-4 w-4 text-amber-300" />
            </Link>
            {user ? (
              <button type="button" onClick={logout} aria-label={`Выйти из профиля ${user.name}`} className="glass inline-flex h-10 w-10 items-center justify-center rounded-full">
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <Link to="/auth" aria-label="Войти" className="glass inline-flex h-10 w-10 items-center justify-center rounded-full">
                <LogIn className="h-4 w-4" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
              className="glass inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        {metaQuery.isLoading ? (
          <div className="mb-4 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
            Загружаю базу вопросов...
          </div>
        ) : null}
        {metaQuery.isError ? (
          <div className="mb-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-50">
            Не удалось открыть локальную базу. Обновите страницу.
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={profileName}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.35 }}
          >
            {React.cloneElement(children as React.ReactElement, {
              meta,
              profileName,
            })}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell><HomePage /></AppShell>} />
      <Route path="/practice" element={<AppShell><PracticePage /></AppShell>} />
      <Route path="/review" element={<AppShell><ReviewPage /></AppShell>} />
      <Route path="/games" element={<AppShell><GamesPage /></AppShell>} />
      <Route path="/games/:gameId" element={<AppShell><GameRunnerPage /></AppShell>} />
      <Route path="/admin" element={<AppShell><AdminPage /></AppShell>} />
      <Route path="/leaderboard" element={<AppShell><LeaderboardPage /></AppShell>} />
      <Route path="/messages" element={<AppShell><MessagesPage /></AppShell>} />
      <Route path="/messages/:recipientId" element={<AppShell><MessagesPage /></AppShell>} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

import React, { type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTheme } from "./lib/theme";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Bug, LogIn, LogOut, MessageCircle, MoonStar, Send, SunMedium, Sparkles, Trophy } from "lucide-react";
import { HomePage } from "./pages/home";
import { PracticePage } from "./pages/practice";
import { GamesPage } from "./pages/games";
import { GameRunnerPage } from "./pages/game-runner";
import { AdminPage } from "./pages/admin";
import { ReviewPage } from "./pages/review";
import { AuthPage } from "./pages/auth";
import { LeaderboardPage } from "./pages/leaderboard";
import { MessagesPage } from "./pages/messages";
import { BugsPage } from "./pages/bugs";
import { NotificationsPage } from "./pages/notifications";
import { ReportBugPage } from "./pages/report-bug";
import { dashboardMeta } from "@server/content";
import type { DashboardMeta, Profile, ProfileStats } from "@shared/types";
import { useAuth } from "./lib/auth";
import { getUnreadMessageSummary } from "./lib/chat";
import { APP_VERSION } from "./lib/version";
import { getUnreadBugCount, getUnreadNotificationCount } from "./lib/bugs";
import { isAdminUser } from "./lib/permissions";

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
    lastSeenAt: string | null;
  }>;
  activity: Array<{ date: string; attempts: number; correct: number; xp: number }>;
  topicProgress: Array<{ key: string; title: string; description: string; source: string; color: string; subject?: "it-design" | "management"; mastery: number; answered: number }>;
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
  const location = useLocation();
  const profileName = user?.name ?? "Гость";
  const admin = isAdminUser(user);
  const authToken = user?.authToken ?? "";
  const authenticatedUserId = user?.id ?? "guest";

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
  const unreadNotificationsQuery = useQuery({
    queryKey: ["unread-notifications", authenticatedUserId, authToken],
    queryFn: () => getUnreadNotificationCount(authenticatedUserId, authToken),
    enabled: Boolean(user && authToken && authenticatedUserId !== "guest"),
    retry: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const unreadBugsQuery = useQuery({
    queryKey: ["unread-bugs", authenticatedUserId, authToken],
    queryFn: () => getUnreadBugCount(authenticatedUserId, authToken),
    enabled: Boolean(admin && authToken && authenticatedUserId === "lonexnesss"),
    retry: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const unreadNotificationCount = unreadNotificationsQuery.data?.count ?? 0;
  const unreadBugCount = unreadBugsQuery.data?.count ?? 0;
  const badgeLabel = (count: number) => count > 99 ? "99+" : String(count);
  const sourcePage = `${location.pathname}${location.search}`;

  return (
    <div className="theme-shell min-h-screen text-slate-100">
      <div className="fixed inset-0 -z-10 soft-grid opacity-35" />
      <div className="theme-atmosphere fixed inset-0 -z-20" />

      <header className="theme-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 transition hover:opacity-90 sm:gap-3">
            <div className="theme-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 shadow-glow sm:h-11 sm:w-11">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/80 sm:tracking-[0.25em]">Examora</span>
                <span className="app-version rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold tracking-normal text-cyan-200">{APP_VERSION}</span>
              </div>
              <div className="hidden truncate text-xs text-slate-400 sm:block">ИТ, компьютерная графика и менеджмент</div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 xl:flex">
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
            {admin ? (
              <Link to="/bugs" className="glass relative inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <Bug className="h-4 w-4 text-rose-300" />
                Баги
                {unreadBugCount ? <span className="message-unread-badge inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none">{badgeLabel(unreadBugCount)}</span> : null}
              </Link>
            ) : null}
            {user ? (
              <Link to="/notifications" aria-label={unreadNotificationCount ? `Уведомления, новых: ${unreadNotificationCount}` : "Уведомления"} className="glass relative inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-200 transition hover:bg-white/10">
                <Bell className="h-4 w-4 text-cyan-300" />
                {unreadNotificationCount ? <span className="message-unread-badge absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none">{badgeLabel(unreadNotificationCount)}</span> : null}
              </Link>
            ) : null}
            {user && !admin ? (
              <Link to="/report-bug" state={{ sourcePage }} className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <Send className="h-4 w-4 text-cyan-300" />Сообщить о баге
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

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 xl:hidden">
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

      <main className="mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-6 sm:pt-6 xl:pb-14 lg:px-8">
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

      {user ? (
        <nav className="glass-strong fixed inset-x-2 bottom-2 z-50 flex items-center justify-around rounded-3xl px-1 py-1.5 sm:inset-x-3 sm:bottom-3 sm:px-2 sm:py-2 xl:hidden" aria-label="Быстрые действия">
          <Link to="/messages" className="relative grid min-w-14 place-items-center gap-1 rounded-2xl px-2 py-2 text-[10px] text-slate-300">
            <MessageCircle className="h-5 w-5 text-cyan-300" /><span>Чаты</span>
            {unreadMessageCount ? <span className="message-unread-badge absolute right-1 top-0 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold">{unreadLabel}</span> : null}
          </Link>
          {admin ? (
            <Link to="/bugs" className="relative grid min-w-14 place-items-center gap-1 rounded-2xl px-2 py-2 text-[10px] text-slate-300">
              <Bug className="h-5 w-5 text-rose-300" /><span>Баги</span>
              {unreadBugCount ? <span className="message-unread-badge absolute right-1 top-0 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold">{badgeLabel(unreadBugCount)}</span> : null}
            </Link>
          ) : null}
          <Link to="/notifications" className="relative grid min-w-12 place-items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-slate-300 sm:min-w-14 sm:px-2">
            <Bell className="h-5 w-5 text-cyan-300" /><span>События</span>
            {unreadNotificationCount ? <span className="message-unread-badge absolute right-1 top-0 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold">{badgeLabel(unreadNotificationCount)}</span> : null}
          </Link>
          {!admin ? (
            <Link to="/report-bug" state={{ sourcePage }} className="grid min-w-12 place-items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-slate-300 sm:min-w-14 sm:px-2">
              <Send className="h-5 w-5 text-amber-300" /><span>Сообщить</span>
            </Link>
          ) : null}
          <Link to="/leaderboard" className="grid min-w-12 place-items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-slate-300 sm:min-w-14 sm:px-2">
            <Trophy className="h-5 w-5 text-amber-300" /><span>Рейтинг</span>
          </Link>
        </nav>
      ) : null}
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
      <Route path="/bugs" element={<AppShell><BugsPage /></AppShell>} />
      <Route path="/notifications" element={<AppShell><NotificationsPage /></AppShell>} />
      <Route path="/report-bug" element={<AppShell><ReportBugPage /></AppShell>} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

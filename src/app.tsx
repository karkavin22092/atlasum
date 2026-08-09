import React, { lazy, Suspense, useEffect, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useTheme } from "./lib/theme";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Globe2, Lightbulb, LogIn, Mail, MessageCircle, MoonStar, Send, SunMedium, Sparkles, Trophy } from "lucide-react";
import { HomePage } from "./pages/home";
import { QUESTION_BANK_TOTAL, dashboardMeta, questionCountForTopic } from "@server/content";
import type { DashboardMeta, NashelingoTheoryProgress, Profile, ProfileStats } from "@shared/types";
import { useAuth } from "./lib/auth";
import { getUnreadMessageSummary } from "./lib/chat";
import { APP_VERSION } from "./lib/version";
import { getUnreadFeedbackCount, getUnreadNotificationCount } from "./lib/bugs";
import { PRESENCE_POLL_MS, REALTIME_POLL_MS } from "./lib/realtime";
import { isAdminUser } from "./lib/permissions";
import { AvatarMenu } from "./components/avatar-menu";
import { DESIGN_V22_ENABLED } from "./lib/design-version";

const PracticePage = lazy(() => import("./pages/practice").then(({ PracticePage }) => ({ default: PracticePage })));
const ReviewPage = lazy(() => import("./pages/review").then(({ ReviewPage }) => ({ default: ReviewPage })));
const GamesPage = lazy(() => import("./pages/games").then(({ GamesPage }) => ({ default: GamesPage })));
const GameRunnerPage = lazy(() => import("./pages/game-runner").then(({ GameRunnerPage }) => ({ default: GameRunnerPage })));
const DuelRunnerPage = lazy(() => import("./pages/duel-runner").then(({ DuelRunnerPage }) => ({ default: DuelRunnerPage })));
const AdminPage = lazy(() => import("./pages/admin").then(({ AdminPage }) => ({ default: AdminPage })));
const AuthPage = lazy(() => import("./pages/auth").then(({ AuthPage }) => ({ default: AuthPage })));
const LeaderboardPage = lazy(() => import("./pages/leaderboard").then(({ LeaderboardPage }) => ({ default: LeaderboardPage })));
const MessagesPage = lazy(() => import("./pages/messages").then(({ MessagesPage }) => ({ default: MessagesPage })));
const BugsPage = lazy(() => import("./pages/bugs").then(({ BugsPage }) => ({ default: BugsPage })));
const NotificationsPage = lazy(() => import("./pages/notifications").then(({ NotificationsPage }) => ({ default: NotificationsPage })));
const ReportBugPage = lazy(() => import("./pages/report-bug").then(({ ReportBugPage }) => ({ default: ReportBugPage })));
const WhatsNewPage = lazy(() => import("./pages/whats-new").then(({ WhatsNewPage }) => ({ default: WhatsNewPage })));
const NashelingoPage = lazy(() => import("./pages/nashelingo").then(({ NashelingoPage }) => ({ default: NashelingoPage })));
const NashelingoTopicPage = lazy(() => import("./pages/nashelingo-topic").then(({ NashelingoTopicPage }) => ({ default: NashelingoTopicPage })));
const NashelingoLessonPage = lazy(() => import("./pages/nashelingo-lesson").then(({ NashelingoLessonPage }) => ({ default: NashelingoLessonPage })));

const DeferredPage = ({ children, meta, profileName }: { children: React.ReactElement; meta?: AppMeta; profileName?: string }) => (
  <Suspense fallback={<div className="grid min-h-56 place-items-center text-sm text-slate-400">Загружаем раздел...</div>}>
    {React.cloneElement(children, { meta, profileName })}
  </Suspense>
);

type AppMeta = DashboardMeta & {
  profile: Profile;
  stats: ProfileStats;
  leaderboard: Array<{
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
  }>;
  activity: Array<{ date: string; attempts: number; correct: number; xp: number }>;
  topicProgress: Array<{ key: string; title: string; description: string; source: string; color: string; subject?: "it-design" | "management" | "economics" | "english"; mastery: number; answered: number }>;
  theoryProgress: NashelingoTheoryProgress[];
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
  theoryProgress: [],
  attempts: [],
  achievements: [],
  questionBank: {
    total: QUESTION_BANK_TOTAL,
    topics: dashboardMeta.topics.map((topic) => ({
      key: topic.key,
      title: topic.title,
      questions: questionCountForTopic(topic),
    })),
  },
};

const AppShell = ({ children }: { children: ReactNode }) => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const profileName = user?.name ?? "Гость";
  const admin = isAdminUser(user);
  const authToken = user?.authToken ?? "";
  const authenticatedUserId = user?.id ?? "guest";

  const metaQuery = useQuery({
    queryKey: ["meta", profileName],
    queryFn: () => api.meta(profileName),
    retry: 0,
    refetchInterval: PRESENCE_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const meta = (metaQuery.data ?? fallbackMeta) as AppMeta;
  const unreadMessagesQuery = useQuery({
    queryKey: ["unread-messages", meta.profile.id],
    queryFn: () => getUnreadMessageSummary(meta.profile.id),
    enabled: Boolean(user && meta.profile.id !== "guest"),
    retry: 0,
    refetchInterval: REALTIME_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const unreadMessageCount = unreadMessagesQuery.data?.count ?? 0;
  const unreadLabel = unreadMessageCount > 99 ? "99+" : String(unreadMessageCount);
  const unreadNotificationsQuery = useQuery({
    queryKey: ["unread-notifications", authenticatedUserId, authToken],
    queryFn: () => getUnreadNotificationCount(authenticatedUserId, authToken),
    enabled: Boolean(user && authToken && authenticatedUserId !== "guest"),
    retry: 0,
    refetchInterval: REALTIME_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const unreadFeedbackQuery = useQuery({
    queryKey: ["unread-feedback", authenticatedUserId, authToken],
    queryFn: () => getUnreadFeedbackCount(authenticatedUserId, authToken),
    enabled: Boolean(admin && authToken && authenticatedUserId === "lonexnesss"),
    retry: 0,
    refetchInterval: REALTIME_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const unreadNotificationCount = unreadNotificationsQuery.data?.count ?? 0;
  const unreadFeedbackCount = unreadFeedbackQuery.data?.count ?? 0;
  const badgeLabel = (count: number) => count > 99 ? "99+" : String(count);
  const sourcePage = `${location.pathname}${location.search}`;
  const requestedSubject = new URLSearchParams(location.search).get("subject");
  const activeSubject = requestedSubject === "management" || requestedSubject === "economics" || requestedSubject === "english" ? requestedSubject : "it-design";
  useEffect(() => {
    if (location.pathname !== "/") return;
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  const handleLogoClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname !== "/") return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={`theme-shell min-h-screen text-slate-100${DESIGN_V22_ENABLED ? " design-v22" : ""}`}
      data-subject={activeSubject}
    >
      <div className="fixed inset-0 -z-10 soft-grid opacity-35" />
      <div className="theme-atmosphere fixed inset-0 -z-20" />

      <header className="theme-header v22-header sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to={`/?subject=${activeSubject}`} onClick={handleLogoClick} className="v22-brand flex min-w-0 items-center gap-2.5 transition hover:opacity-90 sm:gap-3">
            <div className="theme-brand-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 shadow-glow sm:h-11 sm:w-11">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/80 sm:tracking-[0.25em]">Examora</span>
                <span className="app-version rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold tracking-normal text-cyan-200">{APP_VERSION}</span>
              </div>
            </div>
          </Link>

          <div className="v22-desktop-nav hidden items-center gap-2 xl:flex">
            {user ? (
              <Link to="/messages" className="glass relative inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <MessageCircle className="h-4 w-4 text-cyan-300" />
                Сообщения
                {unreadMessageCount ? (
                  <span className="message-unread-badge inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none shadow-[0_0_14px_rgba(244,63,94,0.65)]">
                    <span className="message-unread-value">{unreadLabel}</span>
                  </span>
                ) : null}
              </Link>
            ) : null}
            {admin ? (
              <Link to="/proposals" className="glass relative inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <Lightbulb className="h-4 w-4 text-amber-300" />
                Предложения
                {unreadFeedbackCount ? <span className="message-unread-badge inline-flex min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none"><span className="message-unread-value">{badgeLabel(unreadFeedbackCount)}</span></span> : null}
              </Link>
            ) : null}
            {user ? (
              <Link to="/notifications" aria-label={unreadNotificationCount ? `Уведомления, новых: ${unreadNotificationCount}` : "Уведомления"} className="glass relative inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-200 transition hover:bg-white/10">
                <Bell className="h-4 w-4 text-cyan-300" />
                {unreadNotificationCount ? <span className="message-unread-badge absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none"><span className="message-unread-value">{badgeLabel(unreadNotificationCount)}</span></span> : null}
              </Link>
            ) : null}
            {user && !admin ? (
              <Link to="/suggest" state={{ sourcePage }} className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
                <Send className="h-4 w-4 text-cyan-300" />Предложить улучшение
              </Link>
            ) : null}
            <Link to="/leaderboard" className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
              <Trophy className="h-4 w-4 text-amber-300" />
              Рейтинг
            </Link>
            <Link to="/whats-new" className="glass inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm text-slate-200 transition hover:bg-white/10">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Что нового?
            </Link>
            {user ? (
              <div className="glass flex h-11 items-center gap-3 rounded-full px-2 pr-4 text-sm">
                <AvatarMenu />
                <span className="text-slate-300">{user.name}</span>
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

          <div className="v22-mobile-nav flex shrink-0 items-center gap-1.5 sm:gap-2 xl:hidden">
            <Link to="/whats-new" aria-label="Что нового?" className="v22-mobile-extra glass inline-flex h-10 w-10 items-center justify-center rounded-full">
              <Sparkles className="h-4 w-4 text-cyan-300" />
            </Link>
            <Link to="/leaderboard" aria-label="Рейтинг" className="v22-mobile-extra glass inline-flex h-10 w-10 items-center justify-center rounded-full">
              <Trophy className="h-4 w-4 text-amber-300" />
            </Link>
            {user ? (
              <AvatarMenu compact />
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

      <main className="v22-main mx-auto max-w-7xl px-3 pb-28 pt-4 sm:px-6 sm:pt-6 xl:pb-14 lg:px-8">
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

      <footer className={`v22-footer border-t border-white/10 ${user ? "pb-28 xl:pb-8" : "pb-8"}`}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="text-sm font-semibold text-white">Создатель Examora · lonexnesss</div>
            <div className="mt-1 text-xs text-slate-500">Вопросы, предложения и обратная связь</div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <a href="https://t.me/onyxnesss" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-300 transition hover:text-cyan-200"><Send className="h-4 w-4" />@onyxnesss</a>
            <a href="https://vk.ru/lonexnessss" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-300 transition hover:text-cyan-200"><Globe2 className="h-4 w-4" />ВКонтакте</a>
            <a href="mailto:lonexnesss@mail.ru" className="inline-flex items-center gap-2 text-slate-300 transition hover:text-cyan-200"><Mail className="h-4 w-4" />lonexnesss@mail.ru</a>
          </div>
        </div>
      </footer>

      {user ? (
        <nav className="glass-strong v22-bottom-nav fixed inset-x-2 bottom-2 z-50 flex items-center justify-around rounded-3xl px-1 py-1.5 sm:inset-x-3 sm:bottom-3 sm:px-2 sm:py-2 xl:hidden" aria-label="Быстрые действия">
          <Link to="/messages" className="relative grid min-w-14 place-items-center gap-1 rounded-2xl px-2 py-2 text-[10px] text-slate-300">
            <MessageCircle className="h-5 w-5 text-cyan-300" /><span>Чаты</span>
            {unreadMessageCount ? <span className="message-unread-badge absolute right-1 top-0 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold"><span className="message-unread-value">{unreadLabel}</span></span> : null}
          </Link>
          {admin ? (
            <Link to="/proposals" className="relative grid min-w-14 place-items-center gap-1 rounded-2xl px-2 py-2 text-[10px] text-slate-300">
              <Lightbulb className="h-5 w-5 text-amber-300" /><span>Предложения</span>
              {unreadFeedbackCount ? <span className="message-unread-badge absolute right-1 top-0 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold"><span className="message-unread-value">{badgeLabel(unreadFeedbackCount)}</span></span> : null}
            </Link>
          ) : null}
          <Link to="/notifications" className="relative grid min-w-12 place-items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-slate-300 sm:min-w-14 sm:px-2">
            <Bell className="h-5 w-5 text-cyan-300" /><span>События</span>
            {unreadNotificationCount ? <span className="message-unread-badge absolute right-1 top-0 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold"><span className="message-unread-value">{badgeLabel(unreadNotificationCount)}</span></span> : null}
          </Link>
          {!admin ? (
            <Link to="/suggest" state={{ sourcePage }} className="grid min-w-14 place-items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-slate-300 sm:min-w-16 sm:px-2">
              <Send className="h-5 w-5 text-amber-300" /><span className="text-center leading-3">Предложить<br />улучшение</span>
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

const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/auth" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <>{children}</>;
};

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell><HomePage /></AppShell>} />
      <Route path="/practice" element={<RequireAuth><AppShell><DeferredPage><PracticePage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/review" element={<RequireAuth><AppShell><DeferredPage><ReviewPage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/games" element={<RequireAuth><AppShell><DeferredPage><GamesPage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/games/:gameId" element={<RequireAuth><AppShell><DeferredPage><GameRunnerPage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/duels/:duelId" element={<RequireAuth><AppShell><DeferredPage><DuelRunnerPage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/admin" element={<AppShell><DeferredPage><AdminPage /></DeferredPage></AppShell>} />
      <Route path="/leaderboard" element={<AppShell><DeferredPage><LeaderboardPage /></DeferredPage></AppShell>} />
      <Route path="/nashelingo" element={<AppShell><DeferredPage><NashelingoPage /></DeferredPage></AppShell>} />
      <Route path="/nashelingo/topic" element={<RequireAuth><AppShell><DeferredPage><NashelingoTopicPage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/nashelingo/lesson" element={<RequireAuth><AppShell><DeferredPage><NashelingoLessonPage /></DeferredPage></AppShell></RequireAuth>} />
      <Route path="/whats-new" element={<AppShell><DeferredPage><WhatsNewPage /></DeferredPage></AppShell>} />
      <Route path="/messages" element={<AppShell><DeferredPage><MessagesPage /></DeferredPage></AppShell>} />
      <Route path="/messages/:recipientId" element={<AppShell><DeferredPage><MessagesPage /></DeferredPage></AppShell>} />
      <Route path="/proposals" element={<AppShell><DeferredPage><BugsPage /></DeferredPage></AppShell>} />
      <Route path="/notifications" element={<AppShell><DeferredPage><NotificationsPage /></DeferredPage></AppShell>} />
      <Route path="/suggest" element={<AppShell><DeferredPage><ReportBugPage /></DeferredPage></AppShell>} />
      <Route path="/bugs" element={<Navigate to="/proposals" replace />} />
      <Route path="/report-bug" element={<Navigate to="/suggest" replace />} />
      <Route path="/auth" element={<DeferredPage><AuthPage /></DeferredPage>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;

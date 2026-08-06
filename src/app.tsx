import { Navigate, Route, Routes } from "react-router-dom";
import { useTheme } from "./lib/theme";
import { useLocalStorageState } from "./lib/storage";
import { useQuery } from "@tanstack/react-query";
import { api } from "./lib/api";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, MoonStar, SunMedium, Sparkles } from "lucide-react";
import { cn } from "./lib/utils";
import { HomePage } from "./pages/home";
import { PracticePage } from "./pages/practice";
import { GamesPage } from "./pages/games";
import { GameRunnerPage } from "./pages/game-runner";
import { AdminPage } from "./pages/admin";
import { ReviewPage } from "./pages/review";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { theme, setTheme } = useTheme();
  const [profileName, setProfileName] = useLocalStorageState("it-graphics-profile", "Гость");

  const metaQuery = useQuery({
    queryKey: ["meta", profileName],
    queryFn: () => api.meta(profileName),
  });

  const meta = metaQuery.data;

  return (
    <div className="min-h-screen text-slate-100">
      <div className="fixed inset-0 -z-10 soft-grid opacity-35" />
      <div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.12),transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200/80">
                Exam Quest
              </div>
              <div className="text-xs text-slate-400">Информационные технологии и компьютерная графика</div>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <label className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-200">
              <span className="text-slate-400">Профиль</span>
              <input
                className="w-36 bg-transparent text-right outline-none placeholder:text-slate-500"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="Гость"
              />
            </label>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="glass inline-flex h-11 w-11 items-center justify-center rounded-full transition hover:scale-105"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="glass inline-flex h-10 w-10 items-center justify-center rounded-full"
            >
              {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
            </button>
            <button type="button" className="glass inline-flex h-10 w-10 items-center justify-center rounded-full">
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-14 pt-6 sm:px-6 lg:px-8">
        {metaQuery.isLoading ? (
          <div className="grid min-h-[60vh] place-items-center">
            <div className="glass rounded-3xl px-6 py-5 text-sm text-slate-300">Загружаем базу вопросов...</div>
          </div>
        ) : (
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
                setProfileName,
              })}
            </motion.div>
          </AnimatePresence>
        )}
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;


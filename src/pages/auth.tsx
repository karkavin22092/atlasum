import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AtSign, LockKeyhole, MoonStar, Sparkles, SunMedium, UserRound } from "lucide-react";
import { Button, GlassCard } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

export const AuthPage = () => {
  const { user, login, register } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      const destination = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить вход");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="theme-shell relative grid min-h-screen place-items-center overflow-hidden px-4 py-10 text-slate-100">
      <div className="theme-atmosphere fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-10 soft-grid opacity-30" />
      <button
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"}
        className="glass fixed right-4 top-4 grid h-11 w-11 place-items-center rounded-full"
      >
        {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </button>
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-3">
          <div className="theme-brand-mark grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-500 shadow-glow">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Design tests</div>
            <div className="text-xs text-slate-400">Подготовка к экзамену</div>
          </div>
        </Link>

        <GlassCard className="p-6 sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/15 p-1">
            {(["login", "register"] as const).map((item) => (
              <button key={item} type="button" onClick={() => { setMode(item); setError(""); }} className={mode === item ? "rounded-xl bg-white/10 px-3 py-2.5 text-sm font-medium text-white" : "px-3 py-2.5 text-sm text-slate-400"}>
                {item === "login" ? "Вход" : "Регистрация"}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-semibold text-white">{mode === "login" ? "С возвращением" : "Создайте профиль"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Прогресс, XP и место в рейтинге сохраняются в вашем профиле.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Имя в рейтинге</span>
                <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-cyan-300/40">
                  <UserRound className="h-4 w-4 text-slate-500" />
                  <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="w-full bg-transparent py-3.5 outline-none" placeholder="Например, Никита" />
                </span>
              </label>
            ) : null}
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Электронная почта</span>
              <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-cyan-300/40">
                <AtSign className="h-4 w-4 text-slate-500" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="w-full bg-transparent py-3.5 outline-none" placeholder="name@example.ru" required />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-slate-300">Пароль</span>
              <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 focus-within:border-cyan-300/40">
                <LockKeyhole className="h-4 w-4 text-slate-500" />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="w-full bg-transparent py-3.5 outline-none" placeholder="Минимум 6 символов" required />
              </span>
            </label>
            {error ? <div role="alert" className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}
            <Button type="submit" className="w-full py-3.5" disabled={pending}>
              {pending ? "Подождите..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </Button>
          </form>

          <div className="mt-5 text-center text-xs leading-5 text-slate-500">На Netlify профиль хранится локально в этом браузере и не передаётся сторонним сервисам.</div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

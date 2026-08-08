import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, Gift, Lightbulb, LogIn, Send } from "lucide-react";
import { BackButton, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import {
  FeedbackRequestError,
  formatFeedbackPage,
  getFeedbackCooldown,
  submitFeedback,
  type FeedbackKind,
} from "@/lib/bugs";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/permissions";
import type { AppPageProps } from "./types";

const feedbackOptions: Array<{
  kind: FeedbackKind;
  title: string;
  description: string;
  reward: number;
}> = [
  {
    kind: "improvement",
    title: "Предложить улучшение",
    description: "Идея новой функции, режима или изменения интерфейса, которая сделает сайт удобнее и полезнее.",
    reward: 300,
  },
  {
    kind: "bug",
    title: "Сообщить о баге",
    description: "Сообщение о конкретной ошибке: что-то не работает, отображается неправильно или ведёт себя не так, как ожидается.",
    reward: 200,
  },
];

export const ReportBugPage = ({ meta: _meta }: AppPageProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const sourcePage = (location.state as { sourcePage?: string } | null)?.sourcePage ?? "/";
  const sourcePageLabel = formatFeedbackPage(sourcePage);
  const [kind, setKind] = useState<FeedbackKind>("improvement");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const remainingSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const remainingMinutes = Math.ceil(remainingSeconds / 60);
  const selectedOption = feedbackOptions.find((option) => option.kind === kind)!;

  useEffect(() => {
    if (!user?.authToken || isAdminUser(user)) return;
    let active = true;
    setCooldownUntil(0);
    setNow(Date.now());
    getFeedbackCooldown(user.id, user.authToken)
      .then((cooldown) => {
        if (active && cooldown.nextAllowedAt) setCooldownUntil(Date.parse(cooldown.nextAllowedAt));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (currentTime >= cooldownUntil) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!user.authToken) {
      setError("Аккаунт ещё синхронизируется. Подождите несколько секунд и попробуйте снова.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const report = await submitFeedback({
        reporterId: user.id,
        kind,
        title,
        description,
        pageUrl: sourcePage,
      }, user.authToken);
      setCooldownUntil(Date.parse(report.nextAllowedAt));
      setNow(Date.now());
      setSent(true);
      setTitle("");
      setDescription("");
    } catch (caught) {
      if (caught instanceof FeedbackRequestError && caught.nextAllowedAt) {
        setCooldownUntil(Date.parse(caught.nextAllowedAt));
        setNow(Date.now());
      }
      setError(caught instanceof Error ? caught.message : "Не удалось отправить предложение");
    } finally {
      setPending(false);
    }
  };

  if (isAdminUser(user)) return <Navigate to="/proposals" replace />;

  if (!user) {
    return (
      <div className="space-y-6">
        <TitleBlock eyebrow="Обратная связь" title="Предложить улучшение" right={<BackButton to={sourcePage} />} />
        <Panel className="grid min-h-72 place-items-center text-center">
          <div>
            <LogIn className="mx-auto h-10 w-10 text-cyan-300" />
            <div className="mt-4 font-semibold text-white">Сначала войдите в аккаунт</div>
            <div className="mt-2 text-sm text-slate-400">Аккаунт нужен, чтобы сообщить результат рассмотрения и начислить награду.</div>
            <Link to="/auth" state={{ from: "/suggest" }}><Button className="mt-4">Войти</Button></Link>
          </div>
        </Panel>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <TitleBlock eyebrow="Обратная связь" title="Заявка отправлена" right={<BackButton to={sourcePage} />} />
        <Panel className="grid min-h-80 place-items-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <div className="mt-5 text-xl font-semibold text-white">Спасибо, что помогаете развивать Examora</div>
            <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
              {kind === "improvement"
                ? "Если администратор примет улучшение, вам придёт уведомление и начислится 300 XP."
                : "Если баг будет подтверждён и исправлен, вам придёт уведомление и начислится 200 XP."}
            </div>
            {remainingSeconds > 0 ? (
              <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <Clock3 className="h-4 w-4 shrink-0" />
                Следующую заявку можно отправить через {remainingMinutes} мин.
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {remainingSeconds === 0 ? <Button onClick={() => setSent(false)}><Send className="h-4 w-4" />Отправить ещё</Button> : null}
              <Link to={sourcePage}><Button variant="secondary">Вернуться</Button></Link>
            </div>
          </motion.div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TitleBlock
        eyebrow="Обратная связь"
        title="Предложить улучшение"
        description="Выберите тип заявки. Все предложения видит только администратор lonexnesss. От аккаунта можно отправить одну заявку раз в 30 минут."
        right={<BackButton to={sourcePage} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {feedbackOptions.map((option) => {
          const selected = option.kind === kind;
          const Icon = option.kind === "improvement" ? Lightbulb : AlertTriangle;
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => {
                setKind(option.kind);
                setError("");
              }}
              className={selected
                ? "rounded-3xl border border-cyan-300/40 bg-cyan-400/15 p-5 text-left shadow-glow transition"
                : "glass rounded-3xl p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10"}
            >
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${option.kind === "improvement" ? "bg-amber-400/15 text-amber-300" : "bg-rose-400/15 text-rose-300"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">+{option.reward} XP</span>
              </div>
              <div className="mt-4 text-lg font-semibold text-white">{option.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">{option.description}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel>
          <form onSubmit={submit} className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3">
              {kind === "improvement" ? <Lightbulb className="h-5 w-5 text-amber-300" /> : <AlertTriangle className="h-5 w-5 text-rose-300" />}
              <div className="text-sm font-medium text-white">{selectedOption.title}</div>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Краткое название</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                minLength={5}
                maxLength={120}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-cyan-300/40"
                placeholder={kind === "improvement" ? "Например: добавить поиск по темам" : "Например: не открывается отчёт теста"}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                {kind === "improvement" ? "Как должно работать улучшение?" : "Что произошло?"}
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={15}
                maxLength={3000}
                required
                rows={8}
                className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-cyan-300/40"
                placeholder={kind === "improvement"
                  ? "Опишите идею, кому она поможет и как вы представляете её работу..."
                  : "Опишите действия, ожидаемый результат и то, что произошло на самом деле..."}
              />
            </label>
            {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
            {remainingSeconds > 0 ? (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
                <Clock3 className="h-4 w-4 shrink-0" />
                Новую заявку можно отправить через {remainingMinutes} мин.
              </div>
            ) : null}
            <Button type="submit" disabled={pending || remainingSeconds > 0 || title.trim().length < 5 || description.trim().length < 15}>
              <Send className="h-4 w-4" />
              {pending ? "Отправляем..." : remainingSeconds > 0 ? `Подождите ${remainingMinutes} мин.` : "Отправить заявку"}
            </Button>
          </form>
        </Panel>

        <div className="space-y-4">
          <GlassCard>
            <Gift className="h-7 w-7 text-amber-300" />
            <div className="mt-3 font-semibold text-white">Награда за помощь</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">Исправленный баг: 200 XP. Принятое улучшение: 300 XP.</div>
          </GlassCard>
          <GlassCard>
            <Clock3 className="h-7 w-7 text-cyan-300" />
            <div className="mt-3 font-semibold text-white">Интервал отправки</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">Одна заявка каждые 30 минут. Ограничение действует на всех устройствах.</div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Страница</div>
            <div className="mt-2 text-sm text-slate-300">{sourcePageLabel}</div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

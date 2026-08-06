import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Bug, CheckCircle2, Gift, LogIn, Send } from "lucide-react";
import { BackButton, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { reportBug } from "@/lib/bugs";
import { useAuth } from "@/lib/auth";
import type { AppPageProps } from "./types";

export const ReportBugPage = ({ meta: _meta }: AppPageProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const sourcePage = (location.state as { sourcePage?: string } | null)?.sourcePage ?? "/";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

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
      await reportBug({
        reporterId: user.id,
        title,
        description,
        pageUrl: sourcePage,
      }, user.authToken);
      setSent(true);
      setTitle("");
      setDescription("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить обращение");
    } finally {
      setPending(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <TitleBlock eyebrow="Обратная связь" title="Сообщить о баге" right={<BackButton to={sourcePage} />} />
        <Panel className="grid min-h-72 place-items-center text-center">
          <div>
            <LogIn className="mx-auto h-10 w-10 text-cyan-300" />
            <div className="mt-4 font-semibold text-white">Сначала войдите в аккаунт</div>
            <div className="mt-2 text-sm text-slate-400">Аккаунт нужен, чтобы мы уведомили вас об исправлении и начислили награду.</div>
            <Link to="/auth" state={{ from: "/report-bug" }}><Button className="mt-4">Войти</Button></Link>
          </div>
        </Panel>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <TitleBlock eyebrow="Обратная связь" title="Обращение отправлено" right={<BackButton to={sourcePage} />} />
        <Panel className="grid min-h-80 place-items-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
            <div className="mt-5 text-xl font-semibold text-white">Спасибо, что помогаете улучшать Design tests</div>
            <div className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">Когда баг будет отмечен как исправленный, вам придёт уведомление и автоматически начислится 200 XP.</div>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={() => setSent(false)}><Bug className="h-4 w-4" />Сообщить ещё</Button>
              <Link to={sourcePage}><Button variant="secondary">Вернуться</Button></Link>
            </div>
          </motion.div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TitleBlock eyebrow="Обратная связь" title="Сообщить о баге" description="Опишите, что произошло и как повторить проблему. Обращение увидит только администратор lonexnesss." right={<BackButton to={sourcePage} />} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel>
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Краткое название</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={5} maxLength={120} required className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-cyan-300/40" placeholder="Например: не открывается результат теста" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">Что произошло?</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={15} maxLength={3000} required rows={8} className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-cyan-300/40" placeholder="Опишите ваши действия, ожидаемый результат и то, что произошло на самом деле..." />
            </label>
            {error ? <div className="rounded-2xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
            <Button type="submit" disabled={pending || title.trim().length < 5 || description.trim().length < 15}>
              <Send className="h-4 w-4" />{pending ? "Отправляем..." : "Отправить обращение"}
            </Button>
          </form>
        </Panel>
        <div className="space-y-4">
          <GlassCard>
            <Gift className="h-7 w-7 text-amber-300" />
            <div className="mt-3 font-semibold text-white">Награда за помощь</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">После подтверждённого исправления вы получите 200 XP в общий рейтинг.</div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Страница</div>
            <div className="mt-2 break-all text-sm text-slate-300">{sourcePage}</div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, Swords, Trophy, XCircle } from "lucide-react";
import { BackButton, Badge, Button, GlassCard, Panel, ProgressBar, TitleBlock } from "@/components/ui";
import { QuestionRenderer, type AnswerValue } from "@/components/question-renderer";
import { useAuth } from "@/lib/auth";
import { getDuel, leaveDuel, submitDuel, type Duel } from "@/lib/duels";
import { formatDuration } from "@/lib/utils";
import type { Question } from "@shared/types";
import type { AppPageProps } from "./types";
import { difficultyLabels } from "@/lib/question-labels";

const subjectTitle = (subject: Duel["subject"]) => subject === "management" ? "Менеджмент" : subject === "economics" ? "Экономика" : "ИТ и графика";

const playerName = (duel: Duel, id: string | null) => id === duel.inviter.id ? duel.inviter.name : id === duel.invitee.id ? duel.invitee.name : "Игрок";

export const DuelRunnerPage = ({ meta: _meta }: AppPageProps) => {
  const { duelId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = user?.authToken ?? "";
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const submittedRef = useRef(false);
  const leavingRef = useRef(false);
  const duelQuery = useQuery({
    queryKey: ["duel", duelId, token],
    queryFn: () => getDuel(token, duelId),
    enabled: Boolean(token && duelId),
    retry: 0,
    refetchInterval: 2_000,
  });
  const duel = duelQuery.data;
  const questions = duel?.questions ?? [];
  const current = questions[index];
  const attempt = duel?.yourAttempt;
  const hasSubmitted = Boolean(attempt?.submittedAt) || submittedRef.current;
  const answered = Object.keys(answers).length;
  const submitMutation = useMutation({
    mutationFn: (payload: Array<{ questionId: string; answer: AnswerValue | "__timeout__" }>) => submitDuel(token, duelId, payload),
    onSuccess: (next) => {
      submittedRef.current = true;
      duelQuery.refetch().catch(() => undefined);
      if (next.status === "finished") navigate(`/duels/${duelId}`, { replace: true });
    },
  });

  useEffect(() => {
    if (!duel || duel.status !== "active") return;
    const update = () => setTimeLeft(Math.max(0, Date.parse(duel.expiresAt) - Date.now()));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [duel?.expiresAt, duel?.status]);

  const submit = (snapshot = answers) => {
    if (!duel || submitMutation.isPending || hasSubmitted) return;
    const payload = questions.map((question) => ({ questionId: question.id, answer: snapshot[question.id] ?? "__timeout__" as const }));
    submitMutation.mutate(payload);
  };

  useEffect(() => {
    if (timeLeft === 0 && duel?.status === "active" && !hasSubmitted) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, duel?.status]);

  useEffect(() => {
    if (!token || !duelId) return;
    const leave = () => {
      if (leavingRef.current || submittedRef.current || duelQuery.data?.status !== "active" || duelQuery.data.yourAttempt?.submittedAt) return;
      leavingRef.current = true;
      void leaveDuel(token, duelId, true);
    };
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("beforeunload", leave);
      leave();
    };
  }, [duelId, token, duelQuery.data?.status, duelQuery.data?.yourAttempt?.submittedAt]);

  const publicQuestion = useMemo(() => current ? ({ ...current, correct: "" } as unknown as Question) : null, [current]);
  if (!user) return <Panel className="text-center"><Swords className="mx-auto h-10 w-10 text-cyan-300" /><div className="mt-3 font-semibold text-white">Войдите, чтобы играть онлайн</div><Link to="/auth"><Button className="mt-4">Войти</Button></Link></Panel>;
  if (duelQuery.isLoading) return <Panel className="grid min-h-64 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" /></Panel>;
  if (duelQuery.isError || !duel) return <Panel className="text-center"><XCircle className="mx-auto h-10 w-10 text-rose-300" /><div className="mt-3 text-white">Игра не найдена или ссылка больше недействительна.</div><BackButton className="mt-4" to="/games">Вернуться к играм</BackButton></Panel>;

  const finished = duel.status === "finished";
  const cancelled = duel.status === "cancelled" || duel.status === "declined";
  const score = duel.scores[user.id] ?? attempt?.score ?? 0;
  const opponentScore = duel.scores[duel.opponent.id];
  const reward = duel.rewardXp[user.id] ?? 0;

  return (
    <div className="space-y-6">
      <TitleBlock eyebrow="Онлайн-дуэль" title="1 на 1" description={`${subjectTitle(duel.subject)} · ${duel.opponent.name}`} right={<BackButton to="/games" />} />
      {cancelled ? <Panel className="border-amber-300/25 bg-amber-400/10"><div className="flex items-start gap-3"><XCircle className="h-5 w-5 text-amber-300" /><div><div className="font-semibold text-white">Игра отменена</div><div className="mt-1 text-sm text-slate-300">{duel.cancelReason ?? "Приглашение больше недействительно."}</div></div></div></Panel> : null}
      {finished ? (
        <Panel className="space-y-5">
          <div className="text-center"><Trophy className="mx-auto h-12 w-12 text-amber-300" /><h2 className="mt-3 text-2xl font-semibold text-white">{duel.winnerId ? `${playerName(duel, duel.winnerId)} победил` : "Ничья"}</h2><p className="mt-2 text-slate-300">Ваш результат: {score}/10 · соперник: {opponentScore ?? 0}/10</p>{reward ? <Badge tone="amber" className="mt-3">+{reward} XP</Badge> : <Badge tone="slate" className="mt-3">Без награды</Badge>}</div>
          <div className="flex justify-center"><BackButton to="/games">К играм</BackButton></div>
        </Panel>
      ) : duel.status === "pending" ? (
        <Panel className="text-center"><Clock3 className="mx-auto h-10 w-10 text-amber-300" /><h2 className="mt-3 text-xl font-semibold text-white">Ожидаем принятия приглашения</h2><p className="mt-2 text-sm text-slate-400">Если приглашающий выйдет со страницы игр, приглашение будет отменено.</p></Panel>
      ) : duel.status === "active" && hasSubmitted ? (
        <Panel className="text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-300" /><h2 className="mt-3 text-xl font-semibold text-white">Ответы отправлены</h2><p className="mt-2 text-sm text-slate-400">Ожидаем завершения соперника. Результат появится автоматически.</p><div className="mx-auto mt-5 max-w-sm"><ProgressBar value={(attempt?.score ?? 0) * 10} /></div></Panel>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4"><GlassCard><div className="text-xs text-slate-400">Вопрос</div><div className="mt-1 text-2xl font-semibold text-white">{index + 1}/{questions.length}</div></GlassCard><GlassCard><div className="text-xs text-slate-400">Ваши ответы</div><div className="mt-1 text-2xl font-semibold text-white">{answered}/{questions.length}</div></GlassCard><GlassCard><div className="text-xs text-slate-400">Время</div><div className="mt-1 text-2xl font-semibold text-white">{formatDuration(timeLeft)}</div></GlassCard><GlassCard><div className="text-xs text-slate-400">Соперник</div><div className="mt-1 truncate text-lg font-semibold text-white">{duel.opponent.name}</div></GlassCard></div>
          <Panel className="space-y-5">
            {publicQuestion ? <><div className="flex flex-wrap items-center gap-2"><Badge tone="cyan">{current?.topic}</Badge><Badge tone="violet">{current ? difficultyLabels[current.difficulty] : ""}</Badge></div><h2 className="text-2xl font-semibold leading-9 text-white">{current?.question}</h2><QuestionRenderer question={publicQuestion} value={answers[current!.id]} onChange={(value) => setAnswers((prev) => ({ ...prev, [current!.id]: value }))} /></> : null}
            <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="secondary" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}><ArrowLeft className="h-4 w-4" />Назад</Button><div className="flex gap-2"><Button variant="secondary" onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} disabled={index === questions.length - 1}>Далее<ArrowLeft className="h-4 w-4 rotate-180" /></Button><Button onClick={() => submit()} disabled={submitMutation.isPending}>{submitMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Завершить</Button></div></div>
          </Panel>
        </>
      )}
    </div>
  );
};

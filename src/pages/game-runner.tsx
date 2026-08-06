import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { BackButton, Badge, Button, GlassCard, Panel, ProgressBar, TitleBlock } from "@/components/ui";
import { QuestionRenderer, type AnswerValue } from "@/components/question-renderer";
import { AttemptExitGuard, AttemptExitNotice, confirmDiscardAttempt } from "@/components/attempt-exit-guard";
import { shuffleArray, formatDuration } from "@/lib/utils";
import { hasAnswer } from "@/lib/answers";
import { ArrowLeft, ArrowRight, Shuffle, TimerReset, Trophy, RotateCcw, WandSparkles } from "lucide-react";
import type { AppPageProps } from "./types";
import type { GeneratedTest, QuestionType, SubmissionResponse } from "@shared/types";

const GAME_LABELS: Record<string, { title: string; mode: string; duration: number; questions: number; subtitle: string; questionType?: QuestionType }> = {
  cards: { title: "Карточки", mode: "practice", duration: 0, questions: 12, subtitle: "Переворот терминов и определений." },
  speed: { title: "Кто быстрее", mode: "random", duration: 60_000, questions: 20, subtitle: "Максимум ответов за 60 секунд." },
  millionaire: { title: "Миллионер", mode: "random", duration: 0, questions: 15, subtitle: "15 вопросов с подсказками." },
  wheel: { title: "Колесо тем", mode: "random", duration: 0, questions: 8, subtitle: "Случайная тема и быстрый старт." },
  matching: { title: "Собери соответствия", mode: "topic", duration: 0, questions: 10, subtitle: "Соедините понятия и определения." },
  truth: { title: "Правда или ложь", mode: "random", duration: 30_000, questions: 18, subtitle: "Молниеносные верно/неверно.", questionType: "trueFalse" },
  puzzle: { title: "Пазл знаний", mode: "random", duration: 0, questions: 9, subtitle: "Правильные ответы открывают изображение." },
  memory: { title: "Memory", mode: "topic", duration: 0, questions: 8, subtitle: "Найдите пары терминов и определений." },
  timeline: { title: "Хронология", mode: "topic", duration: 0, questions: 6, subtitle: "Соберите этапы жизненного цикла." },
  blitz: { title: "Блиц", mode: "random", duration: 20_000, questions: 10, subtitle: "20 секунд на вопрос." },
};

export const GameRunnerPage = ({ meta, profileName }: AppPageProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const gameId = params.gameId ?? "cards";
  const game = GAME_LABELS[gameId] ?? GAME_LABELS.cards;

  const [deck, setDeck] = useState<GeneratedTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(game.duration);
  const [submitted, setSubmitted] = useState<SubmissionResponse | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [wheelSpin, setWheelSpin] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [lifelines, setLifelines] = useState({
    fifty: true,
    skip: true,
    hint: true,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateTest({
        profileName,
        mode: game.mode,
        count: game.questions,
        topic: selectedTopic,
        questionType: game.questionType,
      }),
    onSuccess: (value) => {
      setDeck(value);
      setAnswers({});
      setIndex(0);
      setSubmitted(null);
      setStartedAt(Date.now());
      setTimeLeft(game.duration);
      setFlipped(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.submitTest>[0]) => api.submitTest(payload),
    onSuccess: (value) => {
      setSubmitted(value);
    },
  });

  useEffect(() => {
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, profileName, selectedTopic]);

  useEffect(() => {
    if (!game.duration || submitted) return;
    const timer = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1000) {
          window.clearInterval(timer);
          return 0;
        }
        return current - 1000;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [game.duration, submitted]);

  useEffect(() => {
    if (timeLeft === 0 && deck && !submitted && game.duration) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const questions = deck?.questions ?? [];
  const current = questions[index];
  const answered = Object.values(answers).filter(hasAnswer).length;
  const progress = questions.length ? (answered / questions.length) * 100 : 0;
  const hasActiveAttempt = questions.length > 0 && !submitted && !isAbandoning;

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
  };

  const submit = async () => {
    if (!deck || submitMutation.isPending) return;
    await submitMutation.mutateAsync({
      profileName,
      mode: gameId,
      count: questions.length,
      durationMs: Date.now() - startedAt,
      topic: selectedTopic,
      answers: questions.filter((question) => hasAnswer(answers[question.id])).map((question) => ({
        questionId: question.id,
        answer: answers[question.id],
      })),
    });
  };

  const finishGame = () => {
    if (answered < questions.length) {
      if (confirmDiscardAttempt(true)) setIsAbandoning(true);
      return;
    }
    void submit();
  };

  useEffect(() => {
    if (isAbandoning) navigate("/games");
  }, [isAbandoning, navigate]);

  const gameBody = useMemo(() => {
    if (!current || submitted) return null;

    if (gameId === "cards") {
      const correctPreview =
        typeof current.correct === "object"
          ? JSON.stringify(current.correct, null, 2)
          : Array.isArray(current.correct)
            ? current.correct.join(", ")
            : String(current.correct);
      return (
        <GlassCard className="min-h-[460px] p-0">
          <button
            type="button"
            className="flex min-h-[460px] w-full flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-br from-slate-950/80 via-slate-900/90 to-slate-950 p-8 text-center transition hover:scale-[1.01]"
            onClick={() => setFlipped((value) => !value)}
          >
            <div className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">Карточка</div>
            <div className="max-w-2xl whitespace-pre-wrap text-3xl font-semibold leading-tight text-white">
              {flipped ? correctPreview : current.question}
            </div>
            <div className="text-sm text-slate-400">{flipped ? "Нажмите, чтобы увидеть термин" : "Нажмите, чтобы перевернуть"}</div>
          </button>
        </GlassCard>
      );
    }

    return (
      <div className="space-y-5">
        <GlassCard>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cyan">{index + 1}/{questions.length}</Badge>
            <Badge tone="violet">{current.topic}</Badge>
            <Badge tone={current.difficulty === "hard" ? "rose" : current.difficulty === "medium" ? "amber" : "emerald"}>
              {current.difficulty}
            </Badge>
          </div>
          <div className="mt-4 text-2xl font-semibold leading-9 text-white">{current.question}</div>
        </GlassCard>
        <QuestionRenderer
          question={current}
          value={answers[current.id]}
          onChange={(value) => updateAnswer(current.id, value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIndex((currentIndex) => Math.max(0, currentIndex - 1))} disabled={index === 0}>
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
            <Button variant="secondary" onClick={() => setIndex((currentIndex) => Math.min(questions.length - 1, currentIndex + 1))} disabled={index === questions.length - 1}>
              Вперёд
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            {gameId === "millionaire" ? (
              <>
                <Button variant="secondary" onClick={() => setLifelines((currentLifelines) => ({ ...currentLifelines, fifty: false }))} disabled={!lifelines.fifty}>
                  50/50
                </Button>
                <Button variant="secondary" onClick={() => setLifelines((currentLifelines) => ({ ...currentLifelines, hint: false }))} disabled={!lifelines.hint}>
                  Подсказка
                </Button>
                <Button variant="secondary" onClick={() => setLifelines((currentLifelines) => ({ ...currentLifelines, skip: false }))} disabled={!lifelines.skip}>
                  Пропуск
                </Button>
              </>
            ) : null}
            <Button onClick={finishGame}>
              <Shuffle className="h-4 w-4" />
              {answered < questions.length ? "Завершить досрочно" : "Завершить игру"}
            </Button>
          </div>
        </div>
      </div>
    );
  }, [answers, current, flipped, gameId, index, lifelines, questions.length, submitted]);

  if (submitted) {
    return (
      <div className="space-y-6">
        <TitleBlock
          eyebrow="Игра завершена"
          title={game.title}
          description="Результат игры записан в статистику и учитывается в прогрессе."
          right={<Link to="/games"><Button variant="secondary">Назад к играм</Button></Link>}
        />
        <Panel>
          <div className="grid gap-4 md:grid-cols-3">
            <GlassCard>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Очки</div>
              <div className="mt-2 text-3xl font-semibold text-white">{submitted.score}/{submitted.maxScore}</div>
            </GlassCard>
            <GlassCard>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Точность</div>
              <div className="mt-2 text-3xl font-semibold text-white">{submitted.percent}%</div>
            </GlassCard>
            <GlassCard>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Время</div>
              <div className="mt-2 text-3xl font-semibold text-white">{formatDuration(submitted.durationMs)}</div>
            </GlassCard>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => generateMutation.mutate()}>
              <RotateCcw className="h-4 w-4" />
              Играть снова
            </Button>
            <Link to="/practice?mode=review">
              <Button variant="secondary">
                <WandSparkles className="h-4 w-4" />
                Повторить слабое
              </Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AttemptExitGuard active={hasActiveAttempt} />
      <TitleBlock
        eyebrow="Мини-игра"
        title={game.title}
        description={game.subtitle}
        right={
          <div className="flex flex-wrap gap-2">
            <BackButton to="/games" />
            {gameId === "wheel" ? (
              <Button variant="secondary" onClick={() => {
                if (!confirmDiscardAttempt(hasActiveAttempt)) return;
                const topic = meta?.topics[Math.floor(Math.random() * meta.topics.length)]?.title ?? null;
                setSelectedTopic(topic);
                setWheelSpin((value) => value + 720);
              }}>
                <TimerReset className="h-4 w-4" />
                Крутить колесо
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => {
              if (confirmDiscardAttempt(hasActiveAttempt)) generateMutation.mutate();
            }}>
              <RotateCcw className="h-4 w-4" />
              Новый раунд
            </Button>
          </div>
        }
      />

      <AttemptExitNotice />

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Раунд</div>
          <div className="mt-2 text-3xl font-semibold text-white">{game.title}</div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Вопросы</div>
          <div className="mt-2 text-3xl font-semibold text-white">{questions.length || game.questions}</div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Прогресс</div>
          <div className="mt-2 text-3xl font-semibold text-white">{Math.round(progress)}%</div>
          <div className="mt-3"><ProgressBar value={progress} /></div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Время</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {game.duration ? formatDuration(timeLeft) : "∞"}
          </div>
        </GlassCard>
      </div>

      {gameId === "wheel" ? (
        <Panel className="text-center">
          <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-glow">
            <div
              className="flex h-44 w-44 items-center justify-center rounded-full bg-[conic-gradient(from_0deg,rgba(56,189,248,0.2),rgba(139,92,246,0.5),rgba(16,185,129,0.35),rgba(56,189,248,0.2))] transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${wheelSpin}deg)` }}
            >
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-950/80 text-sm font-semibold text-white">
                {selectedTopic ?? "Тема"}
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-slate-400">Колесо выбирает тему, а затем вы получаете вопрос на выбранную тему.</div>
        </Panel>
      ) : null}

      <Panel className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Trophy className="h-4 w-4 text-amber-300" />
            {answered} / {questions.length} отвечено
          </div>
          {game.duration ? <Badge tone="amber">Таймер активен</Badge> : <Badge tone="slate">Без таймера</Badge>}
        </div>

        {gameBody}

        {gameId === "puzzle" ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 9 }).map((_, tile) => (
              <div
                key={tile}
                className="aspect-square rounded-3xl border border-white/10 bg-[url('/assets/palette.svg')] bg-cover bg-center"
                style={{ opacity: tile < answered ? 1 : 0.22 }}
              />
            ))}
          </div>
        ) : null}

        {gameId === "memory" ? (
          <div className="grid gap-3 sm:grid-cols-4">
            {shuffleArray(
              questions.slice(0, 8).flatMap((question) => [
                { key: `${question.id}-term`, text: question.question },
                { key: `${question.id}-def`, text: Array.isArray(question.correct) ? question.correct.join(", ") : String(question.correct) },
              ]),
              gameId,
            ).map((card) => (
              <div key={card.key} className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                {card.text}
              </div>
            ))}
          </div>
        ) : null}
      </Panel>
    </div>
  );
};

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { BackButton, Badge, Button, GlassCard, Panel, ProgressBar, TitleBlock } from "@/components/ui";
import { QuestionRenderer, type AnswerValue } from "@/components/question-renderer";
import { EnglishWordHints } from "@/components/english-word-hints";
import { ResultPanel } from "@/components/result-panel";
import { AttemptExitGuard, AttemptExitNotice, confirmDiscardAttempt } from "@/components/attempt-exit-guard";
import { shuffleArray, formatDuration } from "@/lib/utils";
import { hasAnswer } from "@/lib/answers";
import { ArrowLeft, ArrowRight, CheckCircle2, EyeOff, Lightbulb, Shuffle, SkipForward, TimerReset, Trophy, RotateCcw } from "lucide-react";
import type { AppPageProps } from "./types";
import type { FillQuestion, GeneratedTest, MatchingItem, Question, QuestionType, SequenceQuestion, SubmissionResponse } from "@shared/types";
import { difficultyLabels } from "@/lib/question-labels";
import { gameDescription } from "@/lib/game-copy";
import { TopicPicker } from "@/components/topic-picker";

const GAME_LABELS: Record<string, { title: string; mode: string; duration: number; questions: number; subtitle: string; questionType?: QuestionType }> = {
  cards: { title: "Карточки", mode: "practice", duration: 0, questions: 12, subtitle: "Переворот терминов и определений.", questionType: "single" },
  speed: { title: "Кто быстрее", mode: "random", duration: 180_000, questions: 20, subtitle: "Максимум ответов за 3 минуты." },
  millionaire: { title: "Миллионер", mode: "random", duration: 0, questions: 15, subtitle: "15 вопросов с подсказками.", questionType: "single" },
  wheel: { title: "Колесо тем", mode: "random", duration: 0, questions: 8, subtitle: "Случайная тема и быстрый старт." },
  matching: { title: "Собери соответствия", mode: "topic", duration: 0, questions: 10, subtitle: "Соедините понятия и определения.", questionType: "matching" },
  truth: { title: "Правда или ложь", mode: "random", duration: 30_000, questions: 18, subtitle: "Молниеносные верно/неверно.", questionType: "trueFalse" },
  puzzle: { title: "Пазл знаний", mode: "random", duration: 0, questions: 9, subtitle: "Правильные ответы открывают изображение." },
  memory: { title: "Memory", mode: "topic", duration: 0, questions: 8, subtitle: "Найдите пары терминов и определений.", questionType: "single" },
  timeline: { title: "Хронология", mode: "topic", duration: 0, questions: 6, subtitle: "Соберите этапы процесса.", questionType: "sequence" },
  blitz: { title: "Блиц", mode: "random", duration: 25_000, questions: 10, subtitle: "25 секунд на вопрос.", questionType: "single" },
};

const correctAnswerText = (question: Question) => {
  if (["single", "scenario", "imageChoice"].includes(question.type)) {
    return question.options.find((option) => option.id === question.correct)?.text ?? "";
  }
  if (question.type === "trueFalse") return question.correct ? "Верно" : "Неверно";
  if (question.type === "multiple") {
    const ids = Array.isArray(question.correct) ? question.correct : [];
    return question.options.filter((option) => ids.includes(option.id)).map((option) => option.text).join("; ");
  }
  if (question.type === "fill") return (question.correct as FillQuestion).answer;
  if (question.type === "sequence") return (question.correct as SequenceQuestion).correctOrder.join(" → ");
  return question.explanation;
};

const correctSubmissionAnswer = (question: Question): AnswerValue => {
  if (question.type === "fill") return (question.correct as FillQuestion).answer;
  if (question.type === "sequence") return (question.correct as SequenceQuestion).correctOrder;
  return question.correct as AnswerValue;
};

const normalizeAnswerText = (value: string) => value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/giu, "");

const isCorrectAnswer = (question: Question, answer: AnswerValue | undefined) => {
  if (["single", "scenario", "imageChoice"].includes(question.type)) return String(answer) === String(question.correct);
  if (question.type === "trueFalse") return answer === question.correct;
  if (question.type === "multiple") {
    const expected = Array.isArray(question.correct) ? question.correct.map(String).sort() : [];
    const received = Array.isArray(answer) ? answer.map(String).sort() : [];
    return expected.length === received.length && expected.every((item, index) => item === received[index]);
  }
  if (question.type === "fill") {
    const correct = question.correct as FillQuestion;
    return [correct.answer, ...(correct.acceptable ?? [])].map(normalizeAnswerText).includes(normalizeAnswerText(String(answer ?? "")));
  }
  if (question.type === "matching") {
    const expected = (question.correct as MatchingItem[]).map((pair) => `${pair.left}::${pair.right}`).sort();
    const received = Array.isArray(answer) ? answer.map((pair) => typeof pair === "object" ? `${pair.left}::${pair.right}` : String(pair)).sort() : [];
    return expected.length === received.length && expected.every((item, index) => item === received[index]);
  }
  if (question.type === "sequence") {
    const expected = (question.correct as SequenceQuestion).correctOrder.map(normalizeAnswerText);
    const received = Array.isArray(answer) ? answer.map((item) => normalizeAnswerText(String(item))) : [];
    return expected.length === received.length && expected.every((item, index) => item === received[index]);
  }
  return false;
};

export const GameRunnerPage = ({ meta, profileName }: AppPageProps) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gameId = params.gameId ?? "cards";
  const game = GAME_LABELS[gameId] ?? GAME_LABELS.cards;
  const subject = searchParams.get("subject") === "management" ? "management" : searchParams.get("subject") === "economics" ? "economics" : searchParams.get("subject") === "english" ? "english" : "it-design";
  const subjectTopics = meta?.topics.filter((topic) => topic.subject === subject) ?? [];

  const [deck, setDeck] = useState<GeneratedTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(game.duration);
  const [submitted, setSubmitted] = useState<SubmissionResponse | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [wheelSpin, setWheelSpin] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [lifelines, setLifelines] = useState({
    fifty: true,
    skip: true,
    hint: true,
  });
  const [hiddenOptions, setHiddenOptions] = useState<Record<string, string[]>>({});
  const [hintedQuestionId, setHintedQuestionId] = useState<string | null>(null);
  const [memoryOpen, setMemoryOpen] = useState<string[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<string[]>([]);

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateTest({
        profileName,
        mode: game.mode,
        count: game.questions,
        subject,
        topic: selectedTopics.length === 1 ? selectedTopics[0] : null,
        topics: selectedTopics,
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
      setLifelines({ fifty: true, skip: true, hint: true });
      setHiddenOptions({});
      setHintedQuestionId(null);
      setMemoryOpen([]);
      setMemoryMatched([]);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.submitTest>[0]) => api.submitTest(payload),
    onSuccess: (value) => {
      setSubmitted(value);
    },
  });

  useEffect(() => {
    if (!hasStarted) return;
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, profileName, selectedTopics, subject, hasStarted]);

  const questions = deck?.questions ?? [];
  const current = questions[index];
  const answered = Object.values(answers).filter(hasAnswer).length;
  const correctlyAnswered = questions.filter((question) => isCorrectAnswer(question, answers[question.id])).length;
  const progress = questions.length ? (answered / questions.length) * 100 : 0;
  const hasActiveAttempt = questions.length > 0 && !submitted && !isAbandoning;
  const timerQuestionIndex = gameId === "blitz" ? index : -1;

  const startGame = () => {
    if (hasStarted) {
      generateMutation.mutate();
      return;
    }
    setHasStarted(true);
  };

  const memoryCards = useMemo(() => shuffleArray(
    questions.slice(0, 8).flatMap((question) => [
      { key: `${question.id}-term`, pairId: question.id, text: String(question.meta?.concept ?? question.question), question },
      { key: `${question.id}-def`, pairId: question.id, text: correctAnswerText(question), question },
    ]),
    deck?.id ?? "memory",
  ), [deck?.id, questions]);

  useEffect(() => {
    if (!game.duration || submitted) return;
    if (gameId === "blitz") setTimeLeft(game.duration);
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
  }, [game.duration, gameId, submitted, timerQuestionIndex]);

  useEffect(() => {
    if (timeLeft === 0 && deck && !submitted && game.duration) {
      if (gameId === "blitz" && current) {
        const nextAnswers = hasAnswer(answers[current.id]) ? answers : { ...answers, [current.id]: "__timeout__" };
        setAnswers(nextAnswers);
        if (index < questions.length - 1) setIndex((currentIndex) => currentIndex + 1);
        else void submit(nextAnswers);
      } else {
        void submit();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
  };

  const submit = async (answerSnapshot = answers) => {
    if (!deck || submitMutation.isPending) return;
    await submitMutation.mutateAsync({
      profileName,
      mode: gameId,
      count: questions.length,
      durationMs: Date.now() - startedAt,
      topic: selectedTopics.length === 1 ? selectedTopics[0] : selectedTopics.length ? selectedTopics.join(", ") : null,
      questionSnapshot: questions,
      answers: questions.filter((question) => hasAnswer(answerSnapshot[question.id])).map((question) => ({
        questionId: question.id,
        answer: answerSnapshot[question.id],
      })),
    });
  };

  useEffect(() => {
    if (!questions.length || submitted || submitMutation.isPending) return;
    if ((gameId === "cards" || gameId === "memory") && answered === questions.length) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, gameId, questions.length, submitted]);

  const finishGame = () => {
    if (answered < questions.length) {
      if (confirmDiscardAttempt(true)) setIsAbandoning(true);
      return;
    }
    void submit();
  };

  useEffect(() => {
    if (isAbandoning) navigate(`/games?subject=${subject}`);
  }, [isAbandoning, navigate, subject]);

  useEffect(() => {
    if (gameId !== "memory" || memoryOpen.length !== 2) return;
    const [first, second] = memoryOpen.map((key) => memoryCards.find((card) => card.key === key));
    const timer = window.setTimeout(() => {
      if (first && second && first.pairId === second.pairId) {
        setMemoryMatched((matched) => matched.includes(first.pairId) ? matched : [...matched, first.pairId]);
        updateAnswer(first.question.id, correctSubmissionAnswer(first.question));
      }
      setMemoryOpen([]);
    }, first && second && first.pairId === second.pairId ? 450 : 900);
    return () => window.clearTimeout(timer);
  }, [gameId, memoryCards, memoryOpen]);

  const markCard = (known: boolean) => {
    if (!current) return;
    const answer = known
      ? correctSubmissionAnswer(current)
      : current.options.find((option) => option.id !== current.correct)?.id ?? "__skipped__";
    updateAnswer(current.id, answer);
    setFlipped(false);
    if (index < questions.length - 1) setIndex((currentIndex) => currentIndex + 1);
  };

  const useFiftyFifty = () => {
    if (!current || !lifelines.fifty || typeof current.correct !== "string") return;
    const wrongOptions = current.options.filter((option) => option.id !== current.correct).slice(0, 2).map((option) => option.id);
    setHiddenOptions((hidden) => ({ ...hidden, [current.id]: wrongOptions }));
    setLifelines((currentLifelines) => ({ ...currentLifelines, fifty: false }));
  };

  const useHint = () => {
    if (!current || !lifelines.hint) return;
    setHintedQuestionId(current.id);
    setLifelines((currentLifelines) => ({ ...currentLifelines, hint: false }));
  };

  const skipQuestion = () => {
    if (!current || !lifelines.skip) return;
    updateAnswer(current.id, "__skipped__");
    setLifelines((currentLifelines) => ({ ...currentLifelines, skip: false }));
    if (index < questions.length - 1) setIndex((currentIndex) => currentIndex + 1);
  };

  const gameBody = useMemo(() => {
    if (!current || submitted) return null;

    if (gameId === "cards") {
      const correctPreview = correctAnswerText(current);
      return (
        <div className="space-y-4">
          <GlassCard className="min-h-[300px] p-0 sm:min-h-[420px]">
            <button
              type="button"
              className="flex min-h-[300px] w-full flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-br from-slate-950/80 via-slate-900/90 to-slate-950 p-5 text-center transition hover:scale-[1.01] sm:min-h-[420px] sm:p-8"
              onClick={() => setFlipped((value) => !value)}
            >
              <div className="text-xs uppercase tracking-[0.32em] text-cyan-200/80">{flipped ? "Определение" : "Термин"}</div>
              <div className="max-w-2xl whitespace-pre-wrap text-2xl font-semibold leading-tight text-white sm:text-3xl">
                {flipped ? correctPreview : String(current.meta?.concept ?? current.question)}
              </div>
              <div className="text-sm text-slate-400">{flipped ? "Оцените, вспомнили ли вы определение" : "Нажмите, чтобы перевернуть"}</div>
            </button>
          </GlassCard>
          {flipped ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={() => markCard(true)}><CheckCircle2 className="h-4 w-4" />Знал ответ</Button>
              <Button variant="secondary" onClick={() => markCard(false)}>Нужно повторить</Button>
            </div>
          ) : null}
        </div>
      );
    }

    if (gameId === "memory") {
      return (
        <div className="space-y-4">
          <GlassCard className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-300">Открывайте по две карточки и находите пару «термин + определение».</div>
            <Badge tone="emerald">Найдено {memoryMatched.length}/{questions.length}</Badge>
          </GlassCard>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {memoryCards.map((card) => {
              const revealed = memoryOpen.includes(card.key) || memoryMatched.includes(card.pairId);
              return (
                <button
                  key={card.key}
                  type="button"
                  disabled={revealed || memoryOpen.length >= 2}
                  onClick={() => setMemoryOpen((open) => [...open, card.key])}
                  className={revealed
                    ? "min-h-32 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm leading-5 text-emerald-100 shadow-glow sm:min-h-40 sm:rounded-3xl sm:p-4"
                    : "min-h-32 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/15 to-violet-400/10 p-3 text-2xl font-semibold text-cyan-200 transition hover:-translate-y-1 hover:border-cyan-300/40 sm:min-h-40 sm:rounded-3xl sm:p-4"}
                >
                  {revealed ? card.text : "?"}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <GlassCard>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="cyan">{index + 1}/{questions.length}</Badge>
            <Badge tone="violet">{current.topic}</Badge>
            <Badge tone={current.difficulty === "hard" ? "rose" : current.difficulty === "medium" ? "amber" : "emerald"}>
              {difficultyLabels[current.difficulty]}
            </Badge>
          </div>
          <div className="mt-4 text-2xl font-semibold leading-9 text-white">{subject === "english" ? <EnglishWordHints text={current.question} /> : current.question}</div>
        </GlassCard>
        <QuestionRenderer
          question={current}
          value={answers[current.id]}
          onChange={(value) => updateAnswer(current.id, value)}
          hiddenOptionIds={hiddenOptions[current.id]}
        />
        {gameId === "millionaire" && hintedQuestionId === current.id ? (
          <GlassCard className="border-amber-300/25 bg-amber-400/10">
            <div className="flex items-start gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
              <div><div className="font-semibold text-white">Подсказка</div><div className="mt-1 text-sm leading-6 text-slate-300">{String(current.meta?.hint ?? "Сосредоточьтесь на ключевом определении понятия.")}</div></div>
            </div>
          </GlassCard>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setIndex((currentIndex) => Math.max(0, currentIndex - 1))} disabled={index === 0}>
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
            <Button
              variant="secondary"
              onClick={() => setIndex((currentIndex) => Math.min(questions.length - 1, currentIndex + 1))}
              disabled={index === questions.length - 1 || (gameId === "blitz" && !hasAnswer(answers[current.id]))}
            >
              Вперёд
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {gameId === "millionaire" ? (
              <>
                <Button variant="secondary" onClick={useFiftyFifty} disabled={!lifelines.fifty}>
                  <EyeOff className="h-4 w-4" />50/50
                </Button>
                <Button variant="secondary" onClick={useHint} disabled={!lifelines.hint}>
                  <Lightbulb className="h-4 w-4" />Подсказка
                </Button>
                <Button variant="secondary" onClick={skipQuestion} disabled={!lifelines.skip}>
                  <SkipForward className="h-4 w-4" />Пропуск
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
  }, [answers, current, flipped, gameId, hiddenOptions, hintedQuestionId, index, lifelines, memoryCards, memoryMatched, memoryOpen, questions.length, submitted]);

  if (submitted) {
    return (
      <ResultPanel
        result={submitted}
        resultEyebrow="Игра завершена"
        resultTitle={game.title}
        retryLabel="Играть снова"
        newTestLabel="Новый раунд"
        backTo={`/games?subject=${subject}`}
        backLabel="К мини-играм"
        onRetry={() => generateMutation.mutate()}
        onNewTest={() => generateMutation.mutate()}
        onReviewMistakes={() => navigate(`/practice?mode=mistakes&subject=${subject}`)}
      />
    );
  }

  if (!hasStarted) {
    return (
      <div className="space-y-6">
        <TitleBlock
          eyebrow="Мини-игра"
          title={game.title}
          description={gameDescription(gameId, subject, game.subtitle)}
          right={<BackButton to={`/games?subject=${subject}`} />}
        />
        <Panel className="space-y-6">
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">Темы игры</div>
            <TopicPicker
              topics={subjectTopics}
              selected={selectedTopics}
              subject={subject}
              onToggle={(topic) => {
                if (!confirmDiscardAttempt(false)) return;
                setSelectedTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]);
              }}
            />
            <div className="mt-3 text-sm text-slate-400">Можно выбрать несколько тем или оставить выбор пустым, чтобы использовать всю дисциплину.</div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
            <div className="text-sm text-slate-300">Настройки готовы. Вопросы появятся после запуска.</div>
            <Button onClick={startGame}><Trophy className="h-4 w-4" />Начать игру</Button>
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
        description={gameDescription(gameId, subject, game.subtitle)}
        right={
          <div className="flex flex-wrap gap-2">
            <BackButton to={`/games?subject=${subject}`} />
            {gameId === "wheel" ? (
              <Button variant="secondary" onClick={() => {
                if (!confirmDiscardAttempt(hasActiveAttempt)) return;
                const topic = subjectTopics[Math.floor(Math.random() * subjectTopics.length)]?.title ?? null;
                setSelectedTopics(topic ? [topic] : []);
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
                {selectedTopics[0] ?? "Тема"}
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
                style={{ opacity: tile < correctlyAnswered ? 1 : 0.22 }}
              />
            ))}
          </div>
        ) : null}

      </Panel>
    </div>
  );
};

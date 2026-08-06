import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, GlassCard, Panel, ProgressBar, StatCard, TitleBlock } from "@/components/ui";
import { QuestionRenderer, type AnswerValue } from "@/components/question-renderer";
import { ResultPanel } from "@/components/result-panel";
import { formatDuration, shuffleArray } from "@/lib/utils";
import { ArrowLeft, ArrowRight, RefreshCcw, Shuffle, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { AppPageProps } from "./types";
import type { GeneratedTest, SubmissionResponse } from "@shared/types";

const COUNT_OPTIONS = [10, 20, 30, 50, 100];

export const PracticePage = ({ meta, profileName }: AppPageProps) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMode, setSelectedMode] = useState(searchParams.get("mode") ?? "practice");
  const [selectedCount, setSelectedCount] = useState(Number(searchParams.get("count") ?? 10));
  const [selectedTopic, setSelectedTopic] = useState(searchParams.get("topic") ?? "");
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateTest({
        profileName,
        mode: selectedMode,
        count: selectedMode === "exam" ? 30 : selectedCount,
        topic: selectedTopic || null,
      }),
    onSuccess: (value) => {
      setTest(value);
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
      setStartedAt(Date.now());
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.submitTest>[0]) => api.submitTest(payload),
    onSuccess: (value) => {
      setResult(value);
      queryClient.invalidateQueries({ queryKey: ["meta", profileName] });
      queryClient.invalidateQueries({ queryKey: ["reviews", profileName] });
      queryClient.invalidateQueries({ queryKey: ["ranking"] });
    },
  });

  useEffect(() => {
    setSearchParams((params) => {
      params.set("mode", selectedMode);
      params.set("count", String(selectedCount));
      if (selectedTopic) params.set("topic", selectedTopic);
      else params.delete("topic");
      return params;
    }, { replace: true });
  }, [selectedCount, selectedMode, selectedTopic, setSearchParams]);

  useEffect(() => {
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMode, selectedCount, selectedTopic, profileName]);

  const questions = test?.questions ?? [];
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length === 0 ? 0 : (answeredCount / questions.length) * 100;
  const canSubmit = questions.length > 0 && answeredCount === questions.length && !submitMutation.isPending;

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const submit = async () => {
    if (!test) return;
    await submitMutation.mutateAsync({
      profileName,
      mode: selectedMode as never,
      count: questions.length,
      durationMs: Date.now() - startedAt,
      topic: selectedTopic || null,
      answers: questions.map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? "",
      })),
    });
  };

  const weakTopics = useMemo(() => {
    if (!meta) return [];
    return meta.topicProgress
      .filter((topic) => topic.mastery < 60)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 4);
  }, [meta]);

  if (result) {
    return (
      <ResultPanel
        result={result}
        onRetry={() => generateMutation.mutate()}
        onReviewMistakes={() => {
          setSelectedMode("mistakes");
          setSelectedTopic("");
          generateMutation.mutate();
        }}
        onNewTest={() => {
          setSelectedMode((current) => (current === "exam" ? "practice" : current));
          generateMutation.mutate();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <TitleBlock
        eyebrow="Тренажер"
        title={selectedMode === "exam" ? "Экзамен" : "Практика"}
        description="Соберите свой набор вопросов и проходите его в комфортном темпе или на время."
        right={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
              <RefreshCcw className={generateMutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Новый набор
            </Button>
            <Link to="/review">
              <Button variant="secondary">
                <Sparkles className="h-4 w-4" />
                Повторение
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel className="space-y-5">
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">Режим</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {meta?.modes.map((mode) => (
                <button
                  type="button"
                  key={mode.key}
                  onClick={() => setSelectedMode(mode.key)}
                  className={mode.key === selectedMode ? "rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-left text-white" : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}
                >
                  <div className="text-sm font-medium">{mode.title}</div>
                  <div className="mt-1 text-xs text-slate-400">{mode.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">Количество</div>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={selectedMode === "exam"}
                  onClick={() => setSelectedCount(count)}
                  className={selectedCount === count
                    ? "rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm text-white disabled:opacity-100"
                    : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"}
                >
                  {count}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedMode("exam")}
                className={selectedMode === "exam" ? "rounded-full border border-violet-300/40 bg-violet-400/15 px-4 py-2 text-sm text-white" : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"}
              >
                Экзамен
              </button>
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">Тема</div>
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none"
              value={selectedTopic}
              onChange={(event) => setSelectedTopic(event.target.value)}
            >
              <option value="">Все темы</option>
              {meta?.topics.map((topic) => (
                <option key={topic.key} value={topic.title}>
                  {topic.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Вопросов" value={questions.length} hint={selectedMode === "exam" ? "Экзамен всегда на 30" : "Под выбранный режим"} accent="from-cyan-400 to-sky-500" />
            <StatCard label="Отвечено" value={answeredCount} hint="Прогресс по сессии" accent="from-violet-400 to-fuchsia-500" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Прогресс теста</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Слабые темы</div>
            {weakTopics.length ? (
              weakTopics.map((topic) => (
                <GlassCard key={topic.key} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{topic.title}</div>
                    <div className="text-xs text-slate-400">{topic.mastery}% mastery</div>
                  </div>
                  <Link to={`/practice?mode=topic&topic=${encodeURIComponent(topic.title)}`}>
                    <Button variant="secondary">Повторить</Button>
                  </Link>
                </GlassCard>
              ))
            ) : (
              <GlassCard className="text-sm text-slate-400">Пока нет слабых тем. Отличный старт.</GlassCard>
            )}
          </div>
        </Panel>

        <Panel>
          {generateMutation.isPending ? (
            <div className="grid min-h-[55vh] place-items-center">
              <div className="space-y-3 text-center">
                <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-400" />
                <div className="text-sm text-slate-300">Подбираем вопросы под ваш режим...</div>
              </div>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="cyan">{test?.title}</Badge>
                <Badge tone="slate">{currentIndex + 1}/{questions.length}</Badge>
                <Badge tone={currentQuestion.difficulty === "hard" ? "rose" : currentQuestion.difficulty === "medium" ? "amber" : "emerald"}>
                  {currentQuestion.difficulty}
                </Badge>
                <Badge tone="violet">{currentQuestion.topic}</Badge>
              </div>

              <GlassCard className="space-y-3">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{currentQuestion.type}</div>
                <div className="text-xl font-semibold leading-8 text-white">{currentQuestion.question}</div>
                <div className="text-sm text-slate-400">{currentQuestion.explanation}</div>
              </GlassCard>

              {currentQuestion.media ? (
                <GlassCard className="overflow-hidden p-0">
                  <img src={currentQuestion.media.src} alt={currentQuestion.media.alt} className="h-56 w-full object-cover" />
                </GlassCard>
              ) : null}

              <QuestionRenderer
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={(value) => updateAnswer(currentQuestion.id, value)}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Назад
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentIndex((current) => Math.min(questions.length - 1, current + 1))}
                    disabled={currentIndex === questions.length - 1}
                  >
                    Вперёд
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={submit} disabled={!canSubmit}>
                  <Shuffle className="h-4 w-4" />
                  Отправить ответы
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[55vh] place-items-center text-center">
              <div className="space-y-3">
                <div className="text-lg font-semibold text-white">Нет вопросов для отображения</div>
                <Button onClick={() => generateMutation.mutate()}>Сгенерировать снова</Button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

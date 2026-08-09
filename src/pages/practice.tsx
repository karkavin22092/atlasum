import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BackButton, Badge, Button, GlassCard, Panel, StatCard, TitleBlock } from "@/components/ui";
import { QuestionRenderer, type AnswerValue } from "@/components/question-renderer";
import { EnglishWordHints } from "@/components/english-word-hints";
import { ResultPanel } from "@/components/result-panel";
import { AttemptExitGuard, AttemptExitNotice, confirmDiscardAttempt } from "@/components/attempt-exit-guard";
import { countLabel, formatDuration, shuffleArray } from "@/lib/utils";
import { hasAnswer } from "@/lib/answers";
import { ArrowLeft, ArrowRight, ChevronDown, Clock3, FileCheck2, ListRestart, RefreshCcw, Shuffle, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { AppPageProps } from "./types";
import type { GeneratedTest, SubjectId, SubmissionResponse } from "@shared/types";
import { difficultyLabels, questionTypeLabels } from "@/lib/question-labels";
import { TopicPicker } from "@/components/topic-picker";
import { EnglishTenseTheory } from "@/components/english-tense-theory";
import { getEnglishTenseTheory, isEnglishTenseTopic } from "@/lib/english-tense-theory";

const COUNT_OPTIONS = [10, 20, 30, 50, 100];
const EXAM_DURATION_MS = 45 * 60 * 1000;

export const PracticePage = ({ meta, profileName }: AppPageProps) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMode, setSelectedMode] = useState(searchParams.get("mode") ?? "practice");
  const [selectedCount, setSelectedCount] = useState(Number(searchParams.get("count") ?? 10));
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(searchParams.get("subject") === "management" ? "management" : searchParams.get("subject") === "economics" ? "economics" : searchParams.get("subject") === "english" ? "english" : "it-design");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(() => (searchParams.get("topics") ?? searchParams.get("topic") ?? "").split(",").map((topic) => topic.trim()).filter(Boolean));
  const [selectedWeakTopics, setSelectedWeakTopics] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [now, setNow] = useState(Date.now());
  const [timeoutNotice, setTimeoutNotice] = useState<{ answered: number; total: number } | null>(null);
  const [showTimeoutReport, setShowTimeoutReport] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [theoryPage, setTheoryPage] = useState(0);
  const timeoutHandledRef = useRef(false);
  const topicsForTest = selectedTopics.length ? selectedTopics : selectedWeakTopics;

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateTest({
        profileName,
        mode: selectedMode,
        count: selectedMode === "exam" ? 30 : selectedCount,
        subject: selectedSubject,
        topic: topicsForTest.length === 1 ? topicsForTest[0] : null,
        topics: topicsForTest,
      }),
    onSuccess: (value) => {
      setTest(value);
      setAnswers({});
      setCurrentIndex(0);
      setResult(null);
      setStartedAt(Date.now());
      setNow(Date.now());
      setTimeoutNotice(null);
      setShowTimeoutReport(false);
      timeoutHandledRef.current = false;
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
    setSearchParams(
      (params) => {
        params.set("mode", selectedMode);
        params.set("count", String(selectedCount));
        params.set("subject", selectedSubject);
        params.delete("topic");
        if (topicsForTest.length) params.set("topics", topicsForTest.join(","));
        else params.delete("topics");
        return params;
      },
      { replace: true },
    );
  }, [selectedCount, selectedMode, selectedSubject, setSearchParams, topicsForTest]);

  useEffect(() => {
    if (!hasStarted) return;
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, selectedMode, selectedCount, selectedSubject, topicsForTest, profileName]);

  useEffect(() => {
    if (selectedMode !== "exam") return;
    setSelectedTopics([]);
    setSelectedWeakTopics([]);
    setTheoryOpen(false);
  }, [selectedMode]);

  const questions = test?.questions ?? [];
  const englishExam = selectedMode === "exam" && selectedSubject === "english";
  const examActive = selectedMode === "exam";
  const examTimeLeft = examActive ? Math.max(0, EXAM_DURATION_MS - (now - startedAt)) : null;
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.values(answers).filter(hasAnswer).length;
  const progress = questions.length === 0 ? 0 : (answeredCount / questions.length) * 100;
  const canSubmit = questions.length > 0 && answeredCount === questions.length && !submitMutation.isPending;
  const hasActiveAttempt = questions.length > 0 && !result;

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const submit = async (timedOut = false) => {
    if (!test) return;
    await submitMutation.mutateAsync({
      profileName,
      mode: selectedMode as never,
      count: questions.length,
      durationMs: timedOut ? EXAM_DURATION_MS : Date.now() - startedAt,
      topic: topicsForTest.length === 1 ? topicsForTest[0] : topicsForTest.length ? topicsForTest.join(", ") : null,
      questionSnapshot: questions,
      answers: questions.filter((question) => timedOut || hasAnswer(answers[question.id])).map((question) => ({
        questionId: question.id,
        answer: answers[question.id] ?? "__timeout__",
      })),
    });
  };

  useEffect(() => {
    if (!examActive || !test || result || examTimeLeft === null || examTimeLeft <= 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [examActive, examTimeLeft, result, test]);

  useEffect(() => {
    if (examActive && test && !result && examTimeLeft === 0 && !submitMutation.isPending && !timeoutHandledRef.current) {
      timeoutHandledRef.current = true;
      if (answeredCount < questions.length) setTimeoutNotice({ answered: answeredCount, total: questions.length });
      void submit(true);
    }
    // submit is intentionally recreated with the current answers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredCount, examActive, examTimeLeft, questions.length, result, test, submitMutation.isPending]);

  const weakTopics = useMemo(() => {
    if (!meta) return [];
    const subjectTitles = new Set(meta.topics.filter((topic) => topic.subject === selectedSubject).map((topic) => topic.title));
    return meta.topicProgress
      .filter((topic) => subjectTitles.has(topic.title))
      .filter((topic) => topic.mastery < 60)
      .sort((a, b) => a.mastery - b.mastery);
  }, [meta, selectedSubject]);

  const filteredTopics = meta?.topics.filter((topic) => topic.subject === selectedSubject) ?? [];
  const selectedModeTitle = meta?.modes.find((mode) => mode.key === selectedMode)?.title ?? "Режим";
  const selectedTenseTheory = selectedSubject === "english" && selectedTopics.length === 1 ? getEnglishTenseTheory(selectedTopics[0]) : null;
  const hasTenseTopicSelection = selectedSubject === "english" && topicsForTest.some(isEnglishTenseTopic);
  const countOptions = hasTenseTopicSelection ? [10] : COUNT_OPTIONS;

  useEffect(() => {
    if (hasTenseTopicSelection && selectedCount !== 10) setSelectedCount(10);
  }, [hasTenseTopicSelection, selectedCount]);

  useEffect(() => {
    if (!meta) return;
    const validTopics = new Set(meta.topics.filter((topic) => topic.subject === selectedSubject).map((topic) => topic.title));
    if (selectedTopics.some((topic) => !validTopics.has(topic))) {
      setSelectedTopics((current) => current.filter((topic) => validTopics.has(topic)));
    }
    if (selectedWeakTopics.some((topic) => !validTopics.has(topic))) {
      setSelectedWeakTopics((current) => current.filter((topic) => validTopics.has(topic)));
    }
  }, [meta, selectedSubject, selectedTopics, selectedWeakTopics]);

  const reviewMistakes = () => {
    if (selectedMode === "mistakes" && !topicsForTest.length) {
      generateMutation.mutate();
      return;
    }
    setSelectedMode("mistakes");
    setSelectedTopics([]);
    setSelectedWeakTopics([]);
    setTheoryOpen(false);
  };

  const startTest = () => {
    if (!hasStarted && selectedTenseTheory && selectedMode !== "exam" && !theoryOpen) {
      setTheoryPage(0);
      setTheoryOpen(true);
      return;
    }
    if (hasStarted) {
      generateMutation.mutate();
      return;
    }
    setTheoryOpen(false);
    setHasStarted(true);
  };

  if (result && timeoutNotice && !showTimeoutReport) {
    return (
      <div className="mx-auto max-w-2xl py-8">
        <Panel className="border-amber-300/30 bg-amber-400/[0.06] text-center">
          <Clock3 className="mx-auto h-12 w-12 text-amber-300" />
          <div className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Экзамен завершён автоматически</div>
          <h1 className="mt-3 text-3xl font-semibold text-white">Время вышло</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-300">Ответы, которые вы успели дать, сохранены. Остальные задания отмечены как неотвеченные.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <GlassCard><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Успели ответить</div><div className="mt-2 text-3xl font-semibold text-white">{timeoutNotice.answered}/{timeoutNotice.total}</div></GlassCard>
            <GlassCard><div className="text-xs uppercase tracking-[0.2em] text-slate-400">Правильно</div><div className="mt-2 text-3xl font-semibold text-white">{result.correctCount}</div></GlassCard>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={() => setShowTimeoutReport(true)}><FileCheck2 className="h-4 w-4" />Посмотреть отчёт</Button>
            <Button variant="secondary" onClick={reviewMistakes} disabled={result.wrongCount === 0}><ListRestart className="h-4 w-4" />Работа над ошибками</Button>
          </div>
        </Panel>
      </div>
    );
  }

  if (result) {
    return (
      <ResultPanel
        result={result}
        onRetry={() => generateMutation.mutate()}
        onReviewMistakes={reviewMistakes}
        onNewTest={() => {
          if (selectedMode === "exam") {
            setSelectedMode("practice");
            return;
          }
          generateMutation.mutate();
        }}
        initialView={showTimeoutReport ? "report" : "summary"}
      />
    );
  }

  return (
    <div className="space-y-6">
      <AttemptExitGuard active={hasActiveAttempt} />
      <TitleBlock
        eyebrow="Тренажер"
        title={selectedMode === "exam" ? "Экзамен" : "Практика"}
        description="Соберите свой набор вопросов и проходите его в комфортном темпе или на время."
        right={
          <div className="flex flex-wrap gap-2">
            <BackButton to="/" />
            <Button variant="secondary" onClick={() => {
              if (confirmDiscardAttempt(hasActiveAttempt)) startTest();
            }} disabled={generateMutation.isPending}>
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

      <AttemptExitNotice />

      <div className="flex flex-col gap-4">
        <Panel className="order-2 min-w-0 space-y-5">
          <div>
            <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">Дисциплина</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {([
                { key: "it-design", title: "ИТ и графика" },
                { key: "management", title: "Менеджмент" },
                { key: "economics", title: "Экономика" },
                { key: "english", title: "Английский язык" },
              ] as const).map((subject) => (
                <button
                  key={subject.key}
                  type="button"
                  onClick={() => {
                    if (!confirmDiscardAttempt(hasActiveAttempt)) return;
                    setSelectedSubject(subject.key);
                    setSelectedTopics([]);
                    setSelectedWeakTopics([]);
                    setTheoryOpen(false);
                  }}
                  className={selectedSubject === subject.key
                    ? "rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-left text-white"
                    : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}
                >
                  <div className="text-sm font-medium">{subject.title}</div>
                </button>
              ))}
            </div>
          </div>

          <details
            open={settingsOpen}
            onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
            className="group/settings"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 [&::-webkit-details-marker]:hidden">
              <span>Настроить тест</span>
              <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open/settings:rotate-180" />
            </summary>
            <div className="mt-5 space-y-5">
              <details className="group/mode rounded-2xl border border-white/10 bg-white/[0.03]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                  <span>Режим теста</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-slate-400"><span>{selectedModeTitle}</span><ChevronDown className="h-4 w-4 transition-transform group-open/mode:rotate-180" /></span>
                </summary>
                <div className="space-y-5 border-t border-white/10 px-4 py-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {meta?.modes.map((mode) => (
                      <button
                        type="button"
                        key={mode.key}
                        onClick={() => {
                          if (mode.key !== selectedMode && !confirmDiscardAttempt(hasActiveAttempt)) return;
                          if (mode.key === "exam") {
                            setSelectedTopics([]);
                            setSelectedWeakTopics([]);
                          }
                          setSelectedMode(mode.key);
                        }}
                        className={mode.key === selectedMode ? "rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-left text-white" : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}
                      >
                        <div className="text-sm font-medium">{mode.title}</div>
                        <div className="mt-1 text-xs text-slate-400">{mode.description}</div>
                      </button>
                    ))}
                  </div>
                  <div>
                    <div className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-400">Количество вопросов</div>
                    <div className="flex flex-wrap gap-2">
                      {countOptions.map((count) => (
                        <button
                          key={count}
                          type="button"
                          disabled={selectedMode === "exam"}
                          onClick={() => {
                            if (count === selectedCount || confirmDiscardAttempt(hasActiveAttempt)) setSelectedCount(count);
                          }}
                          className={selectedMode === "exam"
                            ? "cursor-not-allowed rounded-full border border-white/5 bg-white/[0.03] px-4 py-2 text-sm text-slate-500"
                            : selectedCount === count
                              ? "rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm text-white"
                              : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"}
                        >
                          {count}
                        </button>
                      ))}
                      {selectedMode === "exam" ? (
                        <span className="ml-auto inline-flex items-center px-1 text-sm font-medium text-slate-400">Экзамен</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </details>

              <details className="group/topics rounded-2xl border border-white/10 bg-white/[0.03]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                  <span>Темы</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-slate-400"><span>{selectedTopics.length ? `Выбрано: ${countLabel(selectedTopics.length, "тема", "темы", "тем")}` : "Все темы"}</span><ChevronDown className="h-4 w-4 transition-transform group-open/topics:rotate-180" /></span>
                </summary>
                <div className="border-t border-white/10 px-4 py-4">
                  <TopicPicker
                    topics={filteredTopics}
                    selected={selectedTopics}
                    subject={selectedSubject}
                    disabled={selectedMode === "exam"}
                    allowExamOnly={selectedMode === "exam"}
                    onToggle={(topic) => {
                      const isExamOnlyTopic = filteredTopics.some((item) => item.title === topic && item.examOnly);
                      if (selectedMode === "exam" && !isExamOnlyTopic) return;
                      if (!confirmDiscardAttempt(hasActiveAttempt)) return;
                      setTheoryOpen(false);
                      setSelectedWeakTopics([]);
                      setSelectedTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]);
                    }}
                  />
                </div>
              </details>

              <details className="group/weak rounded-2xl border border-white/10 bg-white/[0.03]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-white [&::-webkit-details-marker]:hidden">
                  <span>Слабые темы</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-slate-400"><span>{selectedWeakTopics.length ? `Выбрано: ${countLabel(selectedWeakTopics.length, "тема", "темы", "тем")}` : countLabel(weakTopics.length, "тема", "темы", "тем")}</span><ChevronDown className="h-4 w-4 transition-transform group-open/weak:rotate-180" /></span>
                </summary>
                <div className="border-t border-white/10 px-4 py-4">
                  {weakTopics.length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {weakTopics.map((topic) => {
                        const active = selectedWeakTopics.includes(topic.title);
                        return (
                          <button
                            key={topic.key}
                            type="button"
                            aria-pressed={active}
                            disabled={selectedMode === "exam"}
                            onClick={() => {
                              if (selectedMode === "exam") return;
                              if (!confirmDiscardAttempt(hasActiveAttempt)) return;
                              setTheoryOpen(false);
                              setSelectedTopics([]);
                              setSelectedWeakTopics((current) => current.includes(topic.title)
                                ? current.filter((item) => item !== topic.title)
                                : [...current, topic.title]);
                            }}
                            className={selectedMode === "exam"
                              ? "min-w-0 cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-left text-slate-500"
                              : active
                              ? "min-w-0 rounded-xl border border-rose-300/50 bg-rose-400/15 px-3 py-2 text-left text-rose-100"
                              : "min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-slate-300 transition hover:bg-white/10"}
                          >
                            <div className="truncate text-sm font-medium">{topic.title}</div>
                            <div className="mt-0.5 text-xs text-slate-400">{topic.mastery}% пройдено</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">Пока нет слабых тем. Отличный старт.</div>
                  )}
                </div>
              </details>
            </div>
          </details>
        </Panel>

        <Panel className="order-1 min-w-0">
          {hasStarted ? <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <StatCard label="Вопрос" value={questions.length ? `${currentIndex + 1}/${questions.length}` : "—"} hint="Текущий вопрос" accent="from-cyan-400 to-sky-500" />
            <StatCard label="Прогресс" value={`${Math.round(progress)}%`} hint={`${answeredCount} отвечено`} accent="from-violet-400 to-fuchsia-500" />
            {examTimeLeft !== null ? <StatCard label="Осталось" value={formatDuration(examTimeLeft)} hint="Лимит экзамена: 45 минут" accent="from-rose-400 to-pink-500" /> : <StatCard label="Вопросов" value={questions.length} hint="В выбранном тесте" accent="from-emerald-400 to-teal-500" />}
          </div> : null}
          {!hasStarted ? (
            theoryOpen && selectedTenseTheory && selectedMode !== "exam" ? (
              <EnglishTenseTheory
                theory={selectedTenseTheory}
                page={theoryPage}
                onPageChange={setTheoryPage}
                onClose={() => setTheoryOpen(false)}
                onStart={startTest}
              />
            ) : (
              <div className="grid min-h-[28vh] place-items-center py-8 text-center">
                <div className="max-w-md space-y-4">
                  <div className="text-xl font-semibold text-white">Тест готов к запуску</div>
                  <p className="text-sm leading-6 text-slate-400">Выберите дисциплину и при необходимости настройте режим, темы и количество вопросов.</p>
                  <Button onClick={startTest}><Sparkles className="h-4 w-4" />Начать тест</Button>
                </div>
              </div>
            )
          ) : generateMutation.isPending ? (
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
                  {difficultyLabels[currentQuestion.difficulty]}
                </Badge>
                <Badge tone="violet">{currentQuestion.topic}</Badge>
              </div>

              <GlassCard className="space-y-3">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{questionTypeLabels[currentQuestion.type]}</div>
                <div className="text-xl font-semibold leading-8 text-white">{selectedSubject === "english" ? <EnglishWordHints text={currentQuestion.question} /> : currentQuestion.question}</div>
              </GlassCard>

              {currentQuestion.media ? (
                <GlassCard className="overflow-hidden p-0">
                  <img src={currentQuestion.media.src} alt={currentQuestion.media.alt} className="mx-auto h-56 w-full max-w-xl object-contain p-6" />
                </GlassCard>
              ) : null}

              <QuestionRenderer
                key={currentQuestion.id}
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

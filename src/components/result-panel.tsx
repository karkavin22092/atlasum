import { useState } from "react";
import { motion } from "framer-motion";
import type { AttemptResult, QuestionType, SubmissionResponse } from "@shared/types";
import { BackButton, Badge, Button, GlassCard, Panel, ProgressBar, TitleBlock } from "./ui";
import { formatDuration } from "@/lib/utils";
import { difficultyLabels, questionTypeLabels } from "@/lib/question-labels";
import {
  ArrowLeft,
  CheckCircle2,
  CircleX,
  FileCheck2,
  ListRestart,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type Props = {
  result: SubmissionResponse;
  onRetry: () => void;
  onReviewMistakes: () => void;
  onNewTest: () => void;
  resultTitle?: string;
  resultEyebrow?: string;
  backTo?: string;
  backLabel?: string;
  retryLabel?: string;
  newTestLabel?: string;
};

type AnswerTone = "neutral" | "correct" | "wrong";


const answerToneClasses: Record<AnswerTone, string> = {
  neutral: "border-white/10 bg-white/5 text-slate-200",
  correct: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  wrong: "border-rose-400/25 bg-rose-400/10 text-rose-100",
};

const legacyOptionLabel = (value: string) => {
  const match = value.match(/^opt-(\d+)$/i);
  return match ? `Вариант ответа ${match[1]}` : value;
};

const asDisplayItems = (value: unknown) => {
  if (Array.isArray(value)) return value.map((item) => legacyOptionLabel(String(item)));
  if (value === undefined || value === null || value === "") return [];
  return [legacyOptionLabel(String(value))];
};

const AnswerDisplay = ({
  label,
  value,
  type,
  tone,
}: {
  label: string;
  value: unknown;
  type: QuestionType;
  tone: AnswerTone;
}) => {
  const items = asDisplayItems(value);
  const ordered = type === "sequence";

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      {items.length === 0 ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${answerToneClasses[tone]}`}>Нет ответа</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={`${item}-${index}`}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 sm:text-base ${answerToneClasses[tone]}`}
            >
              {ordered ? (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-current/20 bg-black/10 text-xs font-bold">
                  {index + 1}
                </span>
              ) : items.length > 1 ? (
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-current" />
              ) : null}
              <span className="min-w-0 flex-1 break-words">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReportCard = ({ item, index, total }: { item: AttemptResult; index: number; total: number }) => (
  <motion.article
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.3) }}
    className={`overflow-hidden rounded-3xl border ${
      item.isCorrect
        ? "border-emerald-400/25 bg-emerald-400/[0.045]"
        : "border-rose-400/25 bg-rose-400/[0.045]"
    }`}
  >
    <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="slate">Вопрос {index + 1} из {total}</Badge>
        <Badge tone={item.isCorrect ? "emerald" : "rose"}>
          {item.isCorrect ? "Правильно" : "Ошибка"}
        </Badge>
        <Badge tone="cyan">{questionTypeLabels[item.type]}</Badge>
      </div>
      <div className="text-xs font-medium text-slate-400">
        {item.topic} · {difficultyLabels[item.difficulty]}
      </div>
    </div>

    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        {item.isCorrect ? (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-400" />
        ) : (
          <CircleX className="mt-0.5 h-6 w-6 shrink-0 text-rose-400" />
        )}
        <h2 className="text-base font-semibold leading-7 text-white sm:text-lg">{item.question}</h2>
      </div>

      <div className={`grid gap-4 ${item.isCorrect ? "" : "lg:grid-cols-2"}`}>
        <AnswerDisplay
          label="Ваш ответ"
          value={item.userAnswer}
          type={item.type}
          tone={item.isCorrect ? "correct" : "wrong"}
        />
        {!item.isCorrect ? (
          <AnswerDisplay label="Правильный ответ" value={item.correctAnswer} type={item.type} tone="correct" />
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Пояснение</div>
        <p className="mt-2 text-sm leading-6 text-slate-300">{item.explanation}</p>
      </div>
    </div>
  </motion.article>
);

export const ResultPanel = ({
  result,
  onRetry,
  onReviewMistakes,
  onNewTest,
  resultTitle = "Тест завершён",
  resultEyebrow = "Результат",
  backTo = "/",
  backLabel = "Назад",
  retryLabel = "Пройти снова",
  newTestLabel = "Новый тест",
}: Props) => {
  const [view, setView] = useState<"summary" | "report">("summary");

  if (view === "report") {
    return (
      <div className="space-y-6">
        <Panel className="sticky top-20 z-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Отчёт по тесту</div>
              <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Все ответы по порядку</h1>
              <p className="mt-1 text-sm text-slate-400">
                Правильно: {result.correctCount} · Ошибок: {result.wrongCount} · Результат: {result.percent}%
              </p>
            </div>
            <Button variant="secondary" onClick={() => setView("summary")}>
              <ArrowLeft className="h-4 w-4" />
              К результату
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          {result.results.map((item, index) => (
            <ReportCard key={item.questionId} item={item} index={index} total={result.results.length} />
          ))}
        </div>

        <Panel className="flex flex-wrap gap-3">
          <Button onClick={() => setView("summary")}>
            <ArrowLeft className="h-4 w-4" />
            К результату
          </Button>
          {result.wrongCount > 0 ? (
            <Button variant="secondary" onClick={onReviewMistakes}>
              <ListRestart className="h-4 w-4" />
              Повторить ошибки
            </Button>
          ) : null}
          <BackButton to={backTo}>{backLabel}</BackButton>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel>
        <TitleBlock
          eyebrow={resultEyebrow}
          title={resultTitle}
          description="Выберите полный отчёт, чтобы сразу увидеть каждый вопрос, свой ответ и правильное решение."
          right={<Badge tone="violet">Оценка {result.grade}</Badge>}
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Баллы</div>
            <div className="mt-2 text-3xl font-semibold text-white">{result.score}/{result.maxScore}</div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Процент</div>
            <div className="mt-2 text-3xl font-semibold text-white">{result.percent}%</div>
            <div className="mt-3"><ProgressBar value={result.percent} /></div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Время</div>
            <div className="mt-2 text-3xl font-semibold text-white">{formatDuration(result.durationMs)}</div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Награда</div>
            <div className="mt-2 text-3xl font-semibold text-white">+{result.xpGained} XP</div>
          </GlassCard>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setView("report")}
            className="group rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-400/15 to-sky-500/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/45 hover:shadow-glow"
          >
            <FileCheck2 className="h-7 w-7 text-cyan-300" />
            <div className="mt-4 text-lg font-semibold text-white">Посмотреть полный отчёт</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">Все {result.results.length} вопросов по порядку с ответами и пояснениями.</div>
          </button>
          <button
            type="button"
            onClick={onReviewMistakes}
            disabled={result.wrongCount === 0}
            className="group rounded-3xl border border-rose-300/20 bg-gradient-to-br from-rose-400/10 to-orange-400/5 p-5 text-left transition hover:-translate-y-0.5 hover:border-rose-300/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ListRestart className="h-7 w-7 text-rose-300" />
            <div className="mt-4 text-lg font-semibold text-white">Повторить ошибки</div>
            <div className="mt-1 text-sm leading-6 text-slate-400">
              {result.wrongCount > 0 ? `${result.wrongCount} вопросов для повторной тренировки.` : "Ошибок нет, повторение не требуется."}
            </div>
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            {retryLabel}
          </Button>
          <Button variant="secondary" onClick={onNewTest}>
            <Sparkles className="h-4 w-4" />
            {newTestLabel}
          </Button>
          <BackButton to={backTo}>{backLabel}</BackButton>
        </div>
      </Panel>
    </div>
  );
};

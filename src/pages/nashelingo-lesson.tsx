import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { hasAnswer } from "@/lib/answers";
import { Button, Panel } from "@/components/ui";
import { QuestionRenderer, type AnswerValue } from "@/components/question-renderer";
import { EnglishWordHints } from "@/components/english-word-hints";
import { ResultPanel } from "@/components/result-panel";
import { AttemptExitGuard } from "@/components/attempt-exit-guard";
import { ArrowRight, CheckCircle2, CircleX, X } from "lucide-react";
import type { FillQuestion, GeneratedTest, MatchingItem, Question, SequenceQuestion, SubjectId, SubmissionResponse } from "@shared/types";
import type { AppPageProps } from "./types";

const normalizeAnswer = (value: string) => value.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/giu, "");

const answerIsCorrect = (question: Question, answer: AnswerValue | undefined) => {
  if (["single", "scenario", "imageChoice"].includes(question.type)) return String(answer) === String(question.correct);
  if (question.type === "trueFalse") return answer === question.correct;
  if (question.type === "multiple") {
    const expected = Array.isArray(question.correct) ? question.correct.map(String).sort() : [];
    const received = Array.isArray(answer) ? answer.map(String).sort() : [];
    return expected.length === received.length && expected.every((item, index) => item === received[index]);
  }
  if (question.type === "fill") {
    const fill = question.correct as FillQuestion;
    return [fill.answer, ...(fill.acceptable ?? [])].map(normalizeAnswer).includes(normalizeAnswer(String(answer ?? "")));
  }
  if (question.type === "matching") {
    const expected = (question.correct as MatchingItem[]).map((item) => `${item.left}::${item.right}`).sort();
    const received = Array.isArray(answer) ? answer.map((item) => typeof item === "object" ? `${item.left}::${item.right}` : String(item)).sort() : [];
    return expected.length === received.length && expected.every((item, index) => item === received[index]);
  }
  if (question.type === "sequence") {
    const expected = (question.correct as SequenceQuestion).correctOrder.map(normalizeAnswer);
    const received = Array.isArray(answer) ? answer.map((item) => normalizeAnswer(String(item))) : [];
    return expected.length === received.length && expected.every((item, index) => item === received[index]);
  }
  return false;
};

export const NashelingoLessonPage = ({ meta, profileName }: AppPageProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") ?? "";
  const level = Math.max(0, Math.min(4, Number(searchParams.get("level") ?? "0") || 0));
  const selectedSubject: SubjectId = searchParams.get("subject") === "management" ? "management" : searchParams.get("subject") === "economics" ? "economics" : searchParams.get("subject") === "english" ? "english" : "it-design";
  const topicExists = meta?.topics.some((item) => item.subject === selectedSubject && item.title === topic) ?? false;
  const [started, setStarted] = useState(false);
  const [test, setTest] = useState<GeneratedTest | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [showReport, setShowReport] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () => api.generateTest({ profileName, mode: "topic", count: 6, subject: selectedSubject, topic, topics: [topic], lessonIndex: level }),
    onSuccess: (value) => {
      setTest(value);
      setAnswers({});
      setChecked({});
      setCurrentIndex(0);
      setResult(null);
      setShowReport(false);
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
    if (started && topicExists) generateMutation.mutate();
    // Regenerate only when the topic, level, or user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileName, selectedSubject, topic, level, topicExists, started]);

  const questions = test?.questions ?? [];
  const current = questions[currentIndex];
  const currentAnswer = current ? answers[current.id] : undefined;
  const currentChecked = current ? Boolean(checked[current.id]) : false;
  const currentCorrect = current ? answerIsCorrect(current, currentAnswer) : false;
  const answeredCount = Object.values(answers).filter(hasAnswer).length;
  const activeAttempt = questions.length > 0 && !result;

  const updateAnswer = (questionId: string, value: AnswerValue) => {
    if (checked[questionId]) return;
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: value }));
  };

  const finishLesson = async () => {
    if (!test || submitMutation.isPending) return;
    await submitMutation.mutateAsync({
      profileName,
      mode: "topic",
      count: questions.length,
      durationMs: Date.now() - startedAt,
      topic: `${topic}::nashelingo:${level}`,
      questionSnapshot: questions,
      answers: questions.filter((question) => hasAnswer(answers[question.id])).map((question) => ({
        questionId: question.id,
        answer: answers[question.id],
      })),
    });
  };

  const continueLesson = () => {
    if (currentIndex === questions.length - 1) {
      void finishLesson();
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  if (!topic || !topicExists) {
    return (
      <Panel className="mx-auto max-w-2xl text-center">
        <h1 className="text-2xl font-semibold text-white">Тема не найдена</h1>
        <p className="mt-3 text-sm text-slate-400">Вернитесь к учебному маршруту и выберите тему из каталога.</p>
        <Link className="mt-6 inline-flex" to={`/nashelingo?subject=${selectedSubject}`}><Button>К маршруту</Button></Link>
      </Panel>
    );
  }

  if (result && showReport) {
    return (
      <ResultPanel
        result={result}
        resultEyebrow="Нашелинго"
        resultTitle="Урок завершён"
        backTo={`/nashelingo?subject=${selectedSubject}`}
        backLabel="К маршруту"
        retryLabel="Пройти урок ещё раз"
        newTestLabel="К маршруту"
        onRetry={() => generateMutation.mutate()}
        onReviewMistakes={() => navigate(`/practice?mode=mistakes&subject=${selectedSubject}&topics=${encodeURIComponent(topic)}`)}
        onNewTest={() => navigate(`/nashelingo?subject=${selectedSubject}`)}
        initialView="report"
        hideReviewMistakes
      />
    );
  }

  if (result) {
    const passed = result.correctCount >= 4;
    return (
      <div className={`v22-lesson-complete mx-auto max-w-2xl ${passed ? "is-passed" : "is-retry"}`}>
        <div className="v22-lesson-complete-icon">{passed ? <CheckCircle2 /> : <CircleX />}</div>
        <div className="v22-learning-step-label">Нашелинго · уровень {level + 1}</div>
        <h1>{passed ? "Уровень пройден!" : "Попробуйте ещё раз"}</h1>
        <p>{result.correctCount}/6 правильных ответов. Для открытия следующего уровня нужно минимум 4.</p>
        <div className="v22-lesson-complete-score"><strong>{result.correctCount}</strong><span>/ 6</span><b>+{result.xpGained} XP</b></div>
        <div className="v22-lesson-complete-actions">
          <Button onClick={() => setShowReport(true)}>Открыть отчёт</Button>
          <Button variant="secondary" onClick={() => navigate(`/nashelingo/topic?subject=${selectedSubject}&topic=${encodeURIComponent(topic)}`)}>К уровням темы</Button>
          {!passed ? <Button variant="secondary" onClick={() => { setResult(null); setStarted(false); setShowReport(false); }}>Повторить уровень</Button> : null}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="v22-lesson-intro mx-auto max-w-2xl">
        <Link className="v22-lesson-close" to={`/nashelingo?subject=${selectedSubject}`} aria-label="Вернуться к маршруту"><X /></Link>
        <div className="v22-lesson-intro-mark">{topic.slice(0, 1).toUpperCase()}</div>
        <div className="v22-learning-step-label">Нашелинго</div>
        <h1>{topic}</h1>
        <p>Шесть заданий уровня. После проверки вы увидите только результат ответа, а подробные пояснения будут доступны в отчёте.</p>
        <Button className="mt-7 w-full sm:w-auto" onClick={() => setStarted(true)}>Начать урок <ArrowRight className="h-4 w-4" /></Button>
      </div>
    );
  }

  if (generateMutation.isPending || !current) {
    return <div className="v22-lesson-loading"><div /><span>Готовим урок...</span></div>;
  }

  return (
    <div className="v22-lesson mx-auto max-w-3xl">
      <AttemptExitGuard active={activeAttempt} />
      <header className="v22-lesson-topbar">
        <Link className="v22-lesson-close" to={`/nashelingo?subject=${selectedSubject}`} aria-label="Выйти из урока"><X /></Link>
        <div className="v22-lesson-progress"><span style={{ width: `${((currentIndex + (currentChecked ? 1 : 0)) / questions.length) * 100}%` }} /></div>
        <div className="v22-lesson-counter">{currentIndex + 1}/{questions.length}</div>
      </header>

      <main className="v22-lesson-body">
        <div className="v22-learning-step-label">{topic}</div>
        <h1>{selectedSubject === "english" ? <EnglishWordHints text={current.question} /> : current.question}</h1>
        {current.media ? <div className="v22-lesson-media"><img src={current.media.src} alt={current.media.alt} /></div> : null}
        <div className="v22-lesson-answers">
          <QuestionRenderer question={current} value={currentAnswer} onChange={(value) => updateAnswer(current.id, value)} locked={currentChecked} feedback={currentChecked ? (currentCorrect ? "correct" : "wrong") : null} />
        </div>
      </main>

      <footer className={`v22-lesson-checkbar ${currentChecked ? (currentCorrect ? "is-correct" : "is-wrong") : ""}`}>
        {currentChecked ? (
          <div className="v22-lesson-feedback">
            <div className="v22-lesson-feedback-copy">
              {currentCorrect ? <CheckCircle2 /> : <CircleX />}
              <div><strong>{currentCorrect ? "Верно!" : "Неверно"}</strong></div>
            </div>
            <Button onClick={continueLesson} disabled={submitMutation.isPending}>{currentIndex === questions.length - 1 ? "Завершить урок" : "Продолжить"}<ArrowRight className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="flex justify-end"><Button onClick={() => setChecked((currentChecks) => ({ ...currentChecks, [current.id]: true }))} disabled={!hasAnswer(currentAnswer)}>Проверить</Button></div>
        )}
      </footer>
      <div className="v22-lesson-answered" aria-live="polite">Отвечено: {answeredCount} из {questions.length}</div>
    </div>
  );
};

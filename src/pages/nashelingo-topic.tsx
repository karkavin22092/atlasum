import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, Check, Lock, Play } from "lucide-react";
import { Badge, Button, Panel, ProgressBar, TitleBlock } from "@/components/ui";
import { NashelingoTheory } from "@/components/nashelingo-theory";
import { api } from "@/lib/api";
import type { SubjectId } from "@shared/types";
import type { AppPageProps } from "./types";

const subjectName: Record<SubjectId, string> = {
  "it-design": "ИТ и компьютерная графика",
  management: "Менеджмент",
  economics: "Экономика",
  english: "Английский язык",
};

const sectionNames = ["Основы", "Практика", "Закрепление"];

export const NashelingoTopicPage = ({ meta, profileName }: AppPageProps) => {
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const subject = (params.get("subject") === "management" || params.get("subject") === "economics" || params.get("subject") === "english" ? params.get("subject") : "it-design") as SubjectId;
  const topic = params.get("topic") ?? "";
  const topicMeta = meta?.topics.find((item) => item.subject === subject && item.title === topic);
  const progress = meta?.topicProgress.find((item) => item.subject === subject && item.title === topic);
  const theoryPages = topicMeta?.theory ?? [];
  const theoryCompleted = meta?.theoryProgress?.some((item) => item.subject === subject && item.topic === topic) ?? false;
  const [theoryOpen, setTheoryOpen] = useState(false);
  const [theoryPage, setTheoryPage] = useState(0);
  const completedByLevel = Array.from({ length: 5 }, (_, level) =>
    (meta?.nashelingoLevelProgress ?? []).some((item) =>
      item.subject === subject && item.topic === topic && item.level === level && item.correctCount >= 4,
    ) || (meta?.attempts ?? []).some((attempt) =>
      attempt.mode === "topic"
      && attempt.topic === `${topic}::nashelingo:${level}`
      && attempt.count === 6
      && attempt.items.filter((item) => item.isCorrect).length >= 4,
    ),
  );
  const completedLevels = completedByLevel.filter(Boolean).length;
  const percent = Math.round((completedLevels / 5) * 100);

  const completeTheoryMutation = useMutation({
    mutationFn: () => api.completeNashelingoTheory({ profileName, subject, topic }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["meta", profileName] });
      setTheoryOpen(false);
    },
  });

  const openTheory = () => {
    setTheoryPage(0);
    setTheoryOpen(true);
  };

  if (!topicMeta) {
    return <Panel className="mx-auto max-w-2xl text-center"><h1>Тема не найдена</h1><Link className="mt-5 inline-flex" to={`/nashelingo?subject=${subject}`}><Button>К маршруту</Button></Link></Panel>;
  }

  return (
    <div className="v22-nashelingo-topic mx-auto max-w-4xl" data-subject={subject}>
      <TitleBlock
        eyebrow={`${subjectName[subject]} · Нашелинго`}
        title={topic}
        description="Сначала пройдите короткую теорию по теме. После неё уровни открываются последовательно: для следующего нужно минимум 4 правильных ответа из 6."
        right={<Link to={`/nashelingo?subject=${subject}`}><Button variant="secondary"><ArrowLeft className="h-4 w-4" />К темам</Button></Link>}
      />

      <Panel className={`v22-topic-theory ${theoryCompleted ? "is-complete" : ""}`}>
        <div className="v22-topic-theory-icon"><BookOpenCheck /></div>
        <div className="min-w-0 flex-1">
          <div className="v22-learning-step-label">Теория темы</div>
          <h2>{theoryCompleted ? "Теория пройдена" : "Откройте тему перед первым уровнем"}</h2>
          <p>{theoryCompleted ? "Можно вернуться к пяти страницам в любое время. Прогресс сохранён в вашем аккаунте." : "Пять коротких экранов с понятиями, логикой и примером именно по этой теме. После завершения откроется первый уровень."}</p>
        </div>
        <Button onClick={openTheory}>{theoryCompleted ? "Повторить теорию" : "Пройти теорию"}</Button>
      </Panel>

      <Panel className="v22-topic-progress-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="v22-learning-step-label">Прогресс темы</div><strong className="text-2xl text-white">{percent}%</strong><span className="ml-2 text-sm text-slate-400">уровней пройдено</span></div>
          <Badge tone={progress?.mastery && progress.mastery >= 70 ? "emerald" : "cyan"}>{progress?.mastery ?? 0}% освоения вопросов</Badge>
        </div>
        <div className="mt-4"><ProgressBar value={percent} /></div>
      </Panel>

      <div className="v22-topic-sections">
        {sectionNames.map((section, sectionIndex) => (
          <section className="v22-topic-section" key={section}>
            <div className="v22-topic-section-heading"><span>{String(sectionIndex + 1).padStart(2, "0")}</span><div><div className="v22-learning-step-label">Раздел {sectionIndex + 1}</div><h2>{section}</h2></div><Badge className="v22-topic-section-progress ml-auto shrink-0" tone="cyan">{Math.round((Math.min(2, Math.max(0, completedLevels - sectionIndex * 2)) / 2) * 100)}%</Badge></div>
            <div className="v22-topic-levels">
              {[0, 1].map((slot) => {
                const level = sectionIndex * 2 + slot;
                if (level >= 5) return null;
                const complete = completedByLevel[level];
                const unlocked = theoryCompleted && (level === 0 || completedByLevel.slice(0, level).every(Boolean));
                const content = <><div className="v22-topic-level-icon">{complete ? <Check /> : unlocked ? <Play /> : <Lock />}</div><div className="min-w-0 flex-1"><div className="v22-learning-step-label">Уровень {level + 1}</div><h3>{level === 0 ? "Первый шаг" : level === 1 ? "Уверенная база" : level === 2 ? "Связи и применение" : level === 3 ? "Сложные случаи" : "Финальное закрепление"}</h3><p>{!theoryCompleted && level === 0 ? "Сначала завершите теорию темы" : level < 2 ? "Ключевые понятия и базовые приёмы" : level < 4 ? "Задания на применение и сравнение" : "Смешанные задания повышенной сложности"}</p></div><Badge tone={complete ? "emerald" : unlocked ? "cyan" : "slate"}>{complete ? "Пройден" : unlocked ? "6 заданий" : !theoryCompleted && level === 0 ? "Теория" : "Закрыт"}</Badge></>;
                return unlocked ? <Link key={level} className={`v22-topic-level is-unlocked ${complete ? "is-complete" : ""}`} to={`/nashelingo/lesson?subject=${subject}&topic=${encodeURIComponent(topic)}&level=${level}`}>{content}</Link> : <div key={level} className="v22-topic-level is-locked" aria-disabled="true">{content}</div>;
              })}
            </div>
          </section>
        ))}
      </div>

      {theoryOpen && theoryPages.length ? <NashelingoTheory topic={topic} pages={theoryPages} completed={theoryCompleted} page={theoryPage} pending={completeTheoryMutation.isPending} onPageChange={setTheoryPage} onComplete={() => completeTheoryMutation.mutate()} onClose={() => setTheoryOpen(false)} /> : null}
    </div>
  );
};

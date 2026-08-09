import { Link, useSearchParams } from "react-router-dom";
import { Badge, BackButton, Panel, ProgressBar, TitleBlock } from "@/components/ui";
import { BriefcaseBusiness, ChevronRight, CircleDollarSign, Languages, Laptop2 } from "lucide-react";
import type { SubjectId } from "@shared/types";
import type { AppPageProps } from "./types";
import { countLabel } from "@/lib/utils";

const subjectPresentation: Record<SubjectId, { title: string; description: string }> = {
  "it-design": {
    title: "ИТ и компьютерная графика",
    description: "Алгоритмы, информационные технологии и компьютерная графика.",
  },
  management: {
    title: "Менеджмент",
    description: "Управление, организационные структуры и принятие решений.",
  },
  economics: {
    title: "Экономика",
    description: "Экономическая теория, микро- и макроэкономика.",
  },
  english: {
    title: "Английский язык",
    description: "Лексика, грамматика и связность академического текста.",
  },
};

export const NashelingoPage = ({ meta }: AppPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSubject = searchParams.get("subject");
  const selectedSubject: SubjectId = requestedSubject === "management" || requestedSubject === "economics" || requestedSubject === "english" ? requestedSubject : "it-design";
  const activeSubject = subjectPresentation[selectedSubject];
  const topics = meta?.topics.filter((topic) => topic.subject === selectedSubject && !topic.examOnly) ?? [];
  const progressByTopic = new Map((meta?.topicProgress ?? []).map((progress) => [progress.title, progress]));
  const completedLevelCount = (title: string) => Array.from({ length: 5 }, (_, level) => (meta?.attempts ?? []).some((attempt) => attempt.mode === "topic" && attempt.topic === `${title}::nashelingo:${level}` && attempt.count === 6 && attempt.items.filter((item) => item.isCorrect).length >= 4)).filter(Boolean).length;
  const passedTopicLevels = topics.reduce((total, topic) => total + completedLevelCount(topic.title), 0);
  const disciplinePercent = topics.length ? Math.round((passedTopicLevels / (topics.length * 5)) * 100) : 0;

  const selectSubject = (subject: SubjectId) => setSearchParams({ subject }, { replace: true });

  return (
    <div className="space-y-6" data-subject={selectedSubject}>
      <TitleBlock
        eyebrow="Учебный маршрут"
        title="Нашелинго"
        description={`Последовательный путь по дисциплине «${activeSubject.title}». Темы идут в учебном порядке каталога и не перемешиваются.`}
        right={<BackButton to={`/?subject=${selectedSubject}`}>На главную</BackButton>}
      />

      <div className="v22-learning-subjects" aria-label="Выбор дисциплины">
        <button type="button" aria-pressed={selectedSubject === "it-design"} onClick={() => selectSubject("it-design")}><Laptop2 />ИТ и графика</button>
        <button type="button" aria-pressed={selectedSubject === "management"} onClick={() => selectSubject("management")}><BriefcaseBusiness />Менеджмент</button>
        <button type="button" aria-pressed={selectedSubject === "economics"} onClick={() => selectSubject("economics")}><CircleDollarSign />Экономика</button>
        <button type="button" aria-pressed={selectedSubject === "english"} onClick={() => selectSubject("english")}><Languages />Английский</button>
      </div>

      <Panel className="v22-learning-panel">
        <div className="v22-learning-intro">
          <div>
            <div className="v22-learning-step-label">Маршрут дисциплины</div>
            <h2>{activeSubject.title}</h2>
            <p>{activeSubject.description}</p>
          </div>
          <div className="v22-learning-total">{disciplinePercent}% · {countLabel(topics.length, "тема", "темы", "тем")}</div>
        </div>
        {topics.length ? (
          <div className="v22-learning-path" aria-label={`Темы дисциплины ${activeSubject.title}`}>
            {topics.map((topic, index) => {
              const progress = progressByTopic.get(topic.title);
              const mastery = progress?.mastery ?? 0;
              const answered = progress?.answered ?? 0;
              const passedLevels = completedLevelCount(topic.title);
              const topicPercent = Math.min(100, Math.round((passedLevels / 5) * 100));
              const state = topicPercent >= 100 ? "complete" : passedLevels > 0 ? "active" : "new";
              return (
                <div className={`v22-learning-step ${index % 2 ? "is-right" : "is-left"}`} data-state={state} key={topic.key}>
                  <Link
                    className="v22-learning-link"
                    to={`/nashelingo/topic?subject=${selectedSubject}&topic=${encodeURIComponent(topic.title)}`}
                    aria-label={`Открыть тему: ${topic.title}`}
                    style={{ animationDelay: `${Math.min(index * 55, 440)}ms` }}
                  >
                    <div className="v22-learning-node" aria-hidden="true">
                      <span>{index + 1}</span>
                    </div>
                    <div className="v22-learning-content">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="v22-learning-step-label">Тема {index + 1}</div>
                          <h3 className="v22-learning-title">{topic.title}</h3>
                        </div>
                        <Badge className="shrink-0 whitespace-nowrap" tone={state === "complete" ? "emerald" : state === "active" ? "amber" : "slate"}>{topicPercent}%</Badge>
                      </div>
                      <p className="v22-learning-description">{topic.description}</p>
                      <div className="v22-learning-meta">
                        <span>{countLabel(answered, "ответ", "ответа", "ответов")}</span>
                        <span>{state === "complete" ? "Тема освоена" : state === "active" ? "В процессе" : "Можно начать"}</span>
                      </div>
                      <ProgressBar value={topicPercent} />
                      <div className="v22-learning-action">Открыть тему <ChevronRight className="h-4 w-4" /></div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="v22-learning-empty">Темы этой дисциплины появятся здесь после загрузки каталога.</div>
        )}
      </Panel>
    </div>
  );
};

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, GlassCard, Panel, ProgressBar, StatCard, TitleBlock } from "@/components/ui";
import { BookOpen, Brain, BriefcaseBusiness, CircleDollarSign, Gamepad2, Laptop2, LineChart, Medal, ShieldCheck, Sparkles, Target, Trophy, UserRound } from "lucide-react";
import type { AppPageProps } from "./types";
import type { SubjectId } from "@shared/types";
import { levelLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/permissions";
import { SiteReviewsSection } from "@/components/site-reviews";
import { difficultyLabels, questionTypeLabels } from "@/lib/question-labels";

const subjectPresentation: Record<SubjectId, { title: string; shortTitle: string; description: string }> = {
  "it-design": {
    title: "ИТ и компьютерная графика",
    shortTitle: "ИТ и графика",
    description: "Алгоритмы, информационные технологии и компьютерная графика: практика, экзамены и игровые режимы.",
  },
  management: {
    title: "Менеджмент",
    shortTitle: "Менеджмент",
    description: "Управление, организационные структуры и решения: практика, экзамены и игровые режимы.",
  },
  economics: {
    title: "Экономика",
    shortTitle: "Экономика",
    description: "Экономическая теория, микро- и макроэкономика: практика, экзамены и игровые режимы.",
  },
};

export const HomePage = ({ meta }: AppPageProps) => {
  const { user } = useAuth();
  const profile = meta?.profile;
  const stats = meta?.stats;
  const admin = isAdminUser(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSubject = searchParams.get("subject");
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>(requestedSubject === "management" || requestedSubject === "economics" ? requestedSubject : "it-design");
  const [selectedTopic, setSelectedTopic] = useState("");
  const filteredTopics = meta?.topics.filter((topic) => topic.subject === selectedSubject) ?? [];
  const firstTopic = filteredTopics[0]?.title ?? "";
  const subjectProgress = meta?.topicProgress.filter((progress) => filteredTopics.some((topic) => topic.title === progress.title)) ?? [];

  useEffect(() => {
    if ((!selectedTopic || !filteredTopics.some((topic) => topic.title === selectedTopic)) && firstTopic) {
      setSelectedTopic(firstTopic);
    }
  }, [filteredTopics, firstTopic, selectedTopic]);

  const previewQuery = useQuery({
    queryKey: ["topic-preview", selectedTopic],
    queryFn: () => api.questions({ topic: selectedTopic || undefined }),
    enabled: Boolean(selectedTopic),
    retry: 0,
  });

  const previewQuestions = (previewQuery.data ?? []).slice(0, 3);
  const activeSubject = subjectPresentation[selectedSubject];
  const selectSubject = (subject: SubjectId) => {
    setSelectedSubject(subject);
    setSelectedTopic("");
    setSearchParams({ subject }, { replace: true });
  };

  return (
    <div className="v22-home space-y-8" data-subject={selectedSubject}>
      <Panel className="v22-hero overflow-hidden">
        <div className="v22-hero-toolbar">
          <div className="v22-subject-switcher" aria-label="Выбор дисциплины">
            <button type="button" aria-pressed={selectedSubject === "it-design"} onClick={() => selectSubject("it-design")}>
              <Laptop2 className="h-4 w-4" />
              <span>{subjectPresentation["it-design"].shortTitle}</span>
            </button>
            <button type="button" aria-pressed={selectedSubject === "management"} onClick={() => selectSubject("management")}>
              <BriefcaseBusiness className="h-4 w-4" />
              <span>{subjectPresentation.management.shortTitle}</span>
            </button>
            <button type="button" aria-pressed={selectedSubject === "economics"} onClick={() => selectSubject("economics")}>
              <CircleDollarSign className="h-4 w-4" />
              <span>{subjectPresentation.economics.shortTitle}</span>
            </button>
          </div>
          <div className="v22-question-count"><span>{meta?.questionBank.total ?? 3560}</span> вопросов в базе</div>
        </div>

        <div className="v22-hero-layout grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="v22-hero-content">
            <div className="v22-hero-kicker">Текущая дисциплина</div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">{activeSubject.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{activeSubject.description}</p>
            <div className="v22-hero-actions mt-7 flex flex-wrap gap-3">
              <Link className="v22-hero-action-exam" to={`/practice?mode=exam&subject=${selectedSubject}`}>
                <Button>
                  <Target className="h-4 w-4" />
                  Начать экзамен
                </Button>
              </Link>
              <Link className="v22-hero-action-practice" to={`/practice?mode=practice&subject=${selectedSubject}`}>
                <Button variant="secondary">
                  <BookOpen className="h-4 w-4" />
                  Свободная практика
                </Button>
              </Link>
              <Link className="v22-hero-action-games" to={`/games?subject=${selectedSubject}`}>
                <Button variant="secondary">
                  <Gamepad2 className="h-4 w-4" />
                  Мини-игры
                </Button>
              </Link>
            </div>
          </div>

          <div className="v22-hero-stats grid gap-4 sm:grid-cols-2">
            <div className="v22-hero-stat space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Уровень</div>
              <div className="text-4xl font-semibold text-white">{profile?.level ?? 1}</div>
              <div className="text-sm text-slate-400">{levelLabel(profile?.level ?? 1)}</div>
            </div>
            <div className="v22-hero-stat space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">XP</div>
              <div className="text-4xl font-semibold text-white">{profile?.xp ?? 0}</div>
              <div className="text-sm text-slate-400">До следующего уровня: {stats?.nextLevelXp ?? 250}</div>
            </div>
            <div className="v22-hero-stat space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Серия</div>
              <div className="text-4xl font-semibold text-white">{profile?.streak ?? 0}</div>
              <div className="text-sm text-slate-400">Лучшая серия: {profile?.bestStreak ?? 0}</div>
            </div>
            <div className="v22-hero-stat space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Точность</div>
              <div className="text-4xl font-semibold text-white">{stats?.accuracy ?? 0}%</div>
              <div className="text-sm text-slate-400">Правильных ответов: {stats?.totalCorrect ?? 0}</div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="v22-overview-stats grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Вопросов решено" value={stats?.totalQuestionsAnswered ?? 0} hint="Результат всех попыток" accent="from-cyan-400 to-sky-500" />
        <StatCard label="В повторение" value={stats?.reviewDue ?? 0} hint="Пора показать снова" accent="from-violet-400 to-fuchsia-500" />
        <StatCard label="Освоено" value={stats?.mastered ?? 0} hint="Вопросы с высокой точностью" accent="from-emerald-400 to-teal-500" />
        <StatCard label="Сложные" value={stats?.weak ?? 0} hint="Нужны повторные подходы" accent="from-amber-400 to-rose-500" />
      </div>

      <Panel>
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <TitleBlock
              eyebrow="Каталог вопросов"
              title="Вопросы и варианты ответов по темам"
              description="Это локальная база проекта. Выберите тему и сразу увидите живые вопросы с вариантами ответа."
            />
            <div className="flex flex-wrap gap-2">
              {filteredTopics.map((topic) => (
                <button
                  key={topic.key}
                  type="button"
                  onClick={() => setSelectedTopic(topic.title)}
                  className={selectedTopic === topic.title
                    ? "rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-sm text-white"
                    : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"}
                >
                  {topic.title}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={`/practice?mode=topic&subject=${selectedSubject}&topic=${encodeURIComponent(selectedTopic)}`}>
                <Button>
                  <BookOpen className="h-4 w-4" />
                  Открыть тему в практике
                </Button>
              </Link>
              {admin ? (
                <Link to="/admin">
                  <Button variant="secondary">
                    <Brain className="h-4 w-4" />
                    Управлять базой
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            {previewQuery.isLoading ? (
              <GlassCard className="text-sm text-slate-400">Загружаем вопросы выбранной темы...</GlassCard>
            ) : previewQuestions.length ? (
              previewQuestions.map((question) => (
                <GlassCard key={question.id} className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="cyan">{question.topic}</Badge>
                    <Badge tone={question.difficulty === "hard" ? "rose" : question.difficulty === "medium" ? "amber" : "emerald"}>
                      {difficultyLabels[question.difficulty]}
                    </Badge>
                    <Badge tone="slate">{questionTypeLabels[question.type]}</Badge>
                  </div>
                  <div className="text-base font-medium leading-7 text-white">{question.question}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {question.options.slice(0, 4).map((option) => (
                      <div key={option.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        {option.text}
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))
            ) : (
              <GlassCard className="text-sm text-slate-400">Для этой темы пока нет предпросмотра.</GlassCard>
            )}
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <TitleBlock
            eyebrow="Режимы"
            title="Выберите сценарий подготовки"
            description="Каждый режим использует локальную базу вопросов и статистику повторения."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {meta?.modes.map((mode) => (
              <Link key={mode.key} to={`/practice?mode=${mode.key}&subject=${selectedSubject}`}>
                <GlassCard className="h-full transition hover:-translate-y-1 hover:border-cyan-300/20">
                  <div className="text-lg font-semibold text-white">{mode.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{mode.description}</div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <TitleBlock eyebrow="Путь" title="Прогресс по темам" description="Больше точности и регулярности там, где есть слабые места." />
          <div className="space-y-4">
            {subjectProgress.slice(0, 8).map((topic) => (
              <GlassCard key={topic.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{topic.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{topic.answered} ответов</div>
                  </div>
                  <Badge tone={topic.mastery >= 70 ? "emerald" : topic.mastery >= 40 ? "amber" : "rose"}>{topic.mastery}%</Badge>
                </div>
                <div className="mt-3">
                  <ProgressBar value={topic.mastery} />
                </div>
              </GlassCard>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <TitleBlock eyebrow="Игры" title="Мини-игры для закрепления" description="Тот же контент, но с другой скоростью и другой подачей." />
          <div className="grid gap-3 sm:grid-cols-2">
            {meta?.games.map((game) => (
              <Link key={game.key} to={`/games/${game.key}?subject=${selectedSubject}`}>
                <GlassCard className="h-full transition hover:-translate-y-1 hover:border-violet-300/20">
                  <div className="text-base font-semibold text-white">{game.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{game.description}</div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <TitleBlock eyebrow="Рейтинг" title="Лидерборд и достижения" description="Личный прогресс и история результатов в одном месте." />
          <div className="space-y-4">
            <GlassCard>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Trophy className="h-4 w-4 text-amber-300" />
                Топ студентов
              </div>
              <div className="space-y-2">
                {meta?.leaderboard.length ? meta.leaderboard.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <div className="flex min-w-0 items-center gap-2 text-slate-200">
                      <div className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-semibold text-white">
                        {entry.avatarUrl ? <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-3.5 w-3.5 text-slate-400" />}
                      </div>
                      <span className="text-slate-500">#{entry.rank}</span>
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <div className="text-slate-400">{entry.xp} XP</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-center text-sm text-slate-400">
                    Зарегистрированных участников пока нет.
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Medal className="h-4 w-4 text-cyan-300" />
                Достижения
              </div>
              <div className="space-y-2">
                {meta?.achievements.length ? (
                  meta.achievements.map((achievement) => (
                    <div key={achievement.key} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                      {achievement.title}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">Пока нет открытых достижений. Начните с первого теста.</div>
                )}
              </div>
            </GlassCard>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4 text-cyan-300" />
            База
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{meta?.questionBank.total ?? 0}</div>
          <div className="mt-1 text-sm text-slate-400">вопросов в локальном JSON и SQLite</div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <LineChart className="h-4 w-4 text-violet-300" />
            Активность
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{meta?.activity.length ?? 0}</div>
          <div className="mt-1 text-sm text-slate-400">дней тренировок в календаре</div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Безопасность
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">Local</div>
          <div className="mt-1 text-sm text-slate-400">никаких платных API и внешних сервисов</div>
        </GlassCard>
      </div>

      <SiteReviewsSection />
    </div>
  );
};

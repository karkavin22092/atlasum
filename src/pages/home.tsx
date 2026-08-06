import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, GlassCard, Panel, ProgressBar, StatCard, TitleBlock } from "@/components/ui";
import { BookOpen, Brain, BriefcaseBusiness, Gamepad2, Laptop2, LineChart, Medal, Send, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import type { AppPageProps } from "./types";
import type { SubjectId } from "@shared/types";
import { levelLabel } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/permissions";

export const HomePage = ({ meta }: AppPageProps) => {
  const { user } = useAuth();
  const profile = meta?.profile;
  const stats = meta?.stats;
  const admin = isAdminUser(user);
  const [selectedSubject, setSelectedSubject] = useState<SubjectId>("it-design");
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

  return (
    <div className="space-y-8">
      <Panel className="overflow-hidden">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge tone="cyan">2100 вопросов</Badge>
              <Badge tone="violet">Интервальное повторение</Badge>
              <Badge tone="emerald">Экзамен и игры</Badge>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Тренажер, который превращает подготовку к экзамену в
              <span className="gradient-text"> понятный и живой</span> процесс.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Практика, экзамены, повторение и игровые режимы для подготовки по ИТ, компьютерной графике и менеджменту.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={`/practice?mode=exam&subject=${selectedSubject}`}>
                <Button>
                  <Target className="h-4 w-4" />
                  Начать экзамен
                </Button>
              </Link>
              <Link to={`/practice?mode=practice&subject=${selectedSubject}`}>
                <Button variant="secondary">
                  <BookOpen className="h-4 w-4" />
                  Свободная практика
                </Button>
              </Link>
              <Link to={`/games?subject=${selectedSubject}`}>
                <Button variant="secondary">
                  <Gamepad2 className="h-4 w-4" />
                  Мини-игры
                </Button>
              </Link>
              {user && !admin ? (
                <Link to="/report-bug" state={{ sourcePage: "/" }}>
                  <Button variant="secondary"><Send className="h-4 w-4" />Сообщить о баге</Button>
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Уровень</div>
              <div className="text-4xl font-semibold text-white">{profile?.level ?? 1}</div>
              <div className="text-sm text-slate-400">{levelLabel(profile?.level ?? 1)}</div>
            </GlassCard>
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">XP</div>
              <div className="text-4xl font-semibold text-white">{profile?.xp ?? 0}</div>
              <div className="text-sm text-slate-400">До следующего уровня: {stats?.nextLevelXp ?? 250}</div>
            </GlassCard>
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Серия</div>
              <div className="text-4xl font-semibold text-white">{profile?.streak ?? 0}</div>
              <div className="text-sm text-slate-400">Лучшая серия: {profile?.bestStreak ?? 0}</div>
            </GlassCard>
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Точность</div>
              <div className="text-4xl font-semibold text-white">{stats?.accuracy ?? 0}%</div>
              <div className="text-sm text-slate-400">Правильных ответов: {stats?.totalCorrect ?? 0}</div>
            </GlassCard>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Вопросов решено" value={stats?.totalQuestionsAnswered ?? 0} hint="Результат всех попыток" accent="from-cyan-400 to-sky-500" />
        <StatCard label="В повторение" value={stats?.reviewDue ?? 0} hint="Пора показать снова" accent="from-violet-400 to-fuchsia-500" />
        <StatCard label="Освоено" value={stats?.mastered ?? 0} hint="Вопросы с высокой точностью" accent="from-emerald-400 to-teal-500" />
        <StatCard label="Сложные" value={stats?.weak ?? 0} hint="Нужны повторные подходы" accent="from-amber-400 to-rose-500" />
      </div>

      <Panel>
        <TitleBlock eyebrow="Направление" title="Выберите дисциплину" description="Темы, экзамены и мини-игры будут собраны только из выбранного направления." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <button type="button" onClick={() => { setSelectedSubject("it-design"); setSelectedTopic(""); }} className={selectedSubject === "it-design" ? "rounded-3xl border border-cyan-300/40 bg-cyan-400/15 p-5 text-left shadow-glow" : "rounded-3xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-1 hover:bg-white/10"}>
            <Laptop2 className="h-7 w-7 text-cyan-300" />
            <div className="mt-4 text-xl font-semibold text-white">ИТ и компьютерная графика</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">26 тем · 1560 вопросов</div>
          </button>
          <button type="button" onClick={() => { setSelectedSubject("management"); setSelectedTopic(""); }} className={selectedSubject === "management" ? "rounded-3xl border border-amber-300/40 bg-amber-400/10 p-5 text-left shadow-glow" : "rounded-3xl border border-white/10 bg-white/5 p-5 text-left transition hover:-translate-y-1 hover:bg-white/10"}>
            <BriefcaseBusiness className="h-7 w-7 text-amber-300" />
            <div className="mt-4 text-xl font-semibold text-white">Менеджмент</div>
            <div className="mt-2 text-sm leading-6 text-slate-400">9 разделов · 540 вопросов</div>
          </button>
        </div>
      </Panel>

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
                      {question.difficulty}
                    </Badge>
                    <Badge tone="slate">{question.type}</Badge>
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
                    <div className="text-slate-200">
                      <span className="mr-2 text-slate-500">#{entry.rank}</span>
                      {entry.name}
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
    </div>
  );
};

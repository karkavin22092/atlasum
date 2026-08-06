import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge, Button, GlassCard, Panel, ProgressBar, StatCard, TitleBlock } from "@/components/ui";
import { BookOpen, Brain, Gamepad2, LineChart, Medal, ShieldCheck, Sparkles, Target, Trophy } from "lucide-react";
import type { AppPageProps } from "./types";
import { levelLabel } from "@/lib/utils";

export const HomePage = ({ meta }: AppPageProps) => {
  const profile = meta?.profile;
  const stats = meta?.stats;
  const [selectedTopic, setSelectedTopic] = useState("");
  const firstTopic = meta?.topics[0]?.title ?? "";

  useEffect(() => {
    if (!selectedTopic && firstTopic) {
      setSelectedTopic(firstTopic);
    }
  }, [firstTopic, selectedTopic]);

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
              <Badge tone="cyan">1500+ РІРѕРїСЂРѕСЃРѕРІ</Badge>
              <Badge tone="violet">РРЅС‚РµСЂРІР°Р»СЊРЅРѕРµ РїРѕРІС‚РѕСЂРµРЅРёРµ</Badge>
              <Badge tone="emerald">Р­РєР·Р°РјРµРЅ Рё РёРіСЂС‹</Badge>
            </div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
              РўСЂРµРЅР°Р¶РµСЂ, РєРѕС‚РѕСЂС‹Р№ РїСЂРµРІСЂР°С‰Р°РµС‚ РїРѕРґРіРѕС‚РѕРІРєСѓ Рє СЌРєР·Р°РјРµРЅСѓ РІ
              <span className="gradient-text"> РїРѕРЅСЏС‚РЅС‹Р№ Рё Р¶РёРІРѕР№</span> РїСЂРѕС†РµСЃСЃ.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              РџСЂР°РєС‚РёРєР°, СЌРєР·Р°РјРµРЅ, РїРѕРІС‚РѕСЂРµРЅРёРµ, СЃС‚Р°С‚РёСЃС‚РёРєР° РїРѕ С‚РµРјР°Рј Рё РёРіСЂРѕРІС‹Рµ СЂРµР¶РёРјС‹ РґР»СЏ РґРёСЃС†РёРїР»РёРЅС‹
              В«РРЅС„РѕСЂРјР°С†РёРѕРЅРЅС‹Рµ С‚РµС…РЅРѕР»РѕРіРёРё Рё РєРѕРјРїСЊСЋС‚РµСЂРЅР°СЏ РіСЂР°С„РёРєР°В».
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/practice?mode=exam">
                <Button>
                  <Target className="h-4 w-4" />
                  РќР°С‡Р°С‚СЊ СЌРєР·Р°РјРµРЅ
                </Button>
              </Link>
              <Link to="/practice?mode=practice">
                <Button variant="secondary">
                  <BookOpen className="h-4 w-4" />
                  РЎРІРѕР±РѕРґРЅР°СЏ РїСЂР°РєС‚РёРєР°
                </Button>
              </Link>
              <Link to="/games">
                <Button variant="secondary">
                  <Gamepad2 className="h-4 w-4" />
                  РњРёРЅРё-РёРіСЂС‹
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">РЈСЂРѕРІРµРЅСЊ</div>
              <div className="text-4xl font-semibold text-white">{profile?.level ?? 1}</div>
              <div className="text-sm text-slate-400">{levelLabel(profile?.level ?? 1)}</div>
            </GlassCard>
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">XP</div>
              <div className="text-4xl font-semibold text-white">{profile?.xp ?? 0}</div>
              <div className="text-sm text-slate-400">Р”Рѕ СЃР»РµРґСѓСЋС‰РµРіРѕ СѓСЂРѕРІРЅСЏ: {stats?.nextLevelXp ?? 250}</div>
            </GlassCard>
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">РЎРµСЂРёСЏ</div>
              <div className="text-4xl font-semibold text-white">{profile?.streak ?? 0}</div>
              <div className="text-sm text-slate-400">Р›СѓС‡С€Р°СЏ СЃРµСЂРёСЏ: {profile?.bestStreak ?? 0}</div>
            </GlassCard>
            <GlassCard className="space-y-2">
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">РўРѕС‡РЅРѕСЃС‚СЊ</div>
              <div className="text-4xl font-semibold text-white">{stats?.accuracy ?? 0}%</div>
              <div className="text-sm text-slate-400">РџСЂР°РІРёР»СЊРЅС‹С… РѕС‚РІРµС‚РѕРІ: {stats?.totalCorrect ?? 0}</div>
            </GlassCard>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Р’РѕРїСЂРѕСЃРѕРІ СЂРµС€РµРЅРѕ" value={stats?.totalQuestionsAnswered ?? 0} hint="Р РµР·СѓР»СЊС‚Р°С‚ РІСЃРµС… РїРѕРїС‹С‚РѕРє" accent="from-cyan-400 to-sky-500" />
        <StatCard label="Р’ РїРѕРІС‚РѕСЂРµРЅРёРµ" value={stats?.reviewDue ?? 0} hint="РџРѕСЂР° РїРѕРєР°Р·Р°С‚СЊ СЃРЅРѕРІР°" accent="from-violet-400 to-fuchsia-500" />
        <StatCard label="РћСЃРІРѕРµРЅРѕ" value={stats?.mastered ?? 0} hint="Р’РѕРїСЂРѕСЃС‹ СЃ РІС‹СЃРѕРєРѕР№ С‚РѕС‡РЅРѕСЃС‚СЊСЋ" accent="from-emerald-400 to-teal-500" />
        <StatCard label="РЎР»РѕР¶РЅС‹Рµ" value={stats?.weak ?? 0} hint="РќСѓР¶РЅС‹ РїРѕРІС‚РѕСЂРЅС‹Рµ РїРѕРґС…РѕРґС‹" accent="from-amber-400 to-rose-500" />
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
              {meta?.topics.map((topic) => (
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
              <Link to={`/practice?mode=topic&topic=${encodeURIComponent(selectedTopic)}`}>
                <Button>
                  <BookOpen className="h-4 w-4" />
                  Открыть тему в практике
                </Button>
              </Link>
              <Link to="/admin">
                <Button variant="secondary">
                  <Brain className="h-4 w-4" />
                  Управлять базой
                </Button>
              </Link>
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
                  <div className="text-sm text-slate-400">{question.explanation}</div>
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
            eyebrow="РРµР¶РёРјС‹"
            title="Р’С‹Р±РµСЂРёС‚Рµ СЃС†РµРЅР°СЂРёР№ РїРѕРґРіРѕС‚РѕРІРєРё"
            description="РљР°Р¶РґС‹Р№ СЂРµР¶РёРј РёСЃРїРѕР»СЊР·СѓРµС‚ Р»РѕРєР°Р»СЊРЅСѓСЋ Р±Р°Р·Сѓ РІРѕРїСЂРѕСЃРѕРІ Рё СЃС‚Р°С‚РёСЃС‚РёРєСѓ РїРѕРІС‚РѕСЂРµРЅРёСЏ."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {meta?.modes.map((mode) => (
              <Link key={mode.key} to={`/practice?mode=${mode.key}`}>
                <GlassCard className="h-full transition hover:-translate-y-1 hover:border-cyan-300/20">
                  <div className="text-lg font-semibold text-white">{mode.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{mode.description}</div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <TitleBlock eyebrow="РџСѓС‚СЊ" title="РџСЂРѕРіСЂРµСЃСЃ РїРѕ С‚РµРјР°Рј" description="Р‘РѕР»СЊС€Рµ С‚РѕС‡РЅРѕСЃС‚Рё Рё СЂРµРіСѓР»СЏСЂРЅРѕСЃС‚Рё С‚Р°Рј, РіРґРµ РµСЃС‚СЊ СЃР»Р°Р±С‹Рµ РјРµСЃС‚Р°." />
          <div className="space-y-4">
            {meta?.topicProgress.slice(0, 8).map((topic) => (
              <GlassCard key={topic.key}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{topic.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{topic.answered} РѕС‚РІРµС‚РѕРІ</div>
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
          <TitleBlock eyebrow="РРіСЂС‹" title="РњРёРЅРё-РёРіСЂС‹ РґР»СЏ Р·Р°РєСЂРµРїР»РµРЅРёСЏ" description="РўРѕС‚ Р¶Рµ РєРѕРЅС‚РµРЅС‚, РЅРѕ СЃ РґСЂСѓРіРѕР№ СЃРєРѕСЂРѕСЃС‚СЊСЋ Рё РґСЂСѓРіРѕР№ РїРѕРґР°С‡РµР№." />
          <div className="grid gap-3 sm:grid-cols-2">
            {meta?.games.map((game) => (
              <Link key={game.key} to={`/games/${game.key}`}>
                <GlassCard className="h-full transition hover:-translate-y-1 hover:border-violet-300/20">
                  <div className="text-base font-semibold text-white">{game.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{game.description}</div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <TitleBlock eyebrow="Р РµР№С‚РёРЅРі" title="Р›РёРґРµСЂР±РѕСЂРґ Рё РґРѕСЃС‚РёР¶РµРЅРёСЏ" description="Р›РёС‡РЅС‹Р№ РїСЂРѕРіСЂРµСЃСЃ Рё РёСЃС‚РѕСЂРёСЏ СЂРµР·СѓР»СЊС‚Р°С‚РѕРІ РІ РѕРґРЅРѕРј РјРµСЃС‚Рµ." />
          <div className="space-y-4">
            <GlassCard>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Trophy className="h-4 w-4 text-amber-300" />
                РўРѕРї СЃС‚СѓРґРµРЅС‚РѕРІ
              </div>
              <div className="space-y-2">
                {meta?.leaderboard.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <div className="text-slate-200">
                      <span className="mr-2 text-slate-500">#{entry.rank}</span>
                      {entry.name}
                    </div>
                    <div className="text-slate-400">{entry.xp} XP</div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Medal className="h-4 w-4 text-cyan-300" />
                Р”РѕСЃС‚РёР¶РµРЅРёСЏ
              </div>
              <div className="space-y-2">
                {meta?.achievements.length ? (
                  meta.achievements.map((achievement) => (
                    <div key={achievement.key} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                      {achievement.title}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-400">РџРѕРєР° РЅРµС‚ РѕС‚РєСЂС‹С‚С‹С… РґРѕСЃС‚РёР¶РµРЅРёР№. РќР°С‡РЅРёС‚Рµ СЃ РїРµСЂРІРѕРіРѕ С‚РµСЃС‚Р°.</div>
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
            Р‘Р°Р·Р°
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{meta?.questionBank.total ?? 0}</div>
          <div className="mt-1 text-sm text-slate-400">РІРѕРїСЂРѕСЃРѕРІ РІ Р»РѕРєР°Р»СЊРЅРѕРј JSON Рё SQLite</div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <LineChart className="h-4 w-4 text-violet-300" />
            РђРєС‚РёРІРЅРѕСЃС‚СЊ
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">{meta?.activity.length ?? 0}</div>
          <div className="mt-1 text-sm text-slate-400">РґРЅРµР№ С‚СЂРµРЅРёСЂРѕРІРѕРє РІ РєР°Р»РµРЅРґР°СЂРµ</div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Р‘РµР·РѕРїР°СЃРЅРѕСЃС‚СЊ
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">Local</div>
          <div className="mt-1 text-sm text-slate-400">РЅРёРєР°РєРёС… РїР»Р°С‚РЅС‹С… API Рё РІРЅРµС€РЅРёС… СЃРµСЂРІРёСЃРѕРІ</div>
        </GlassCard>
      </div>
    </div>
  );
};

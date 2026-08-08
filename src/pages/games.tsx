import { Link, useSearchParams } from "react-router-dom";
import { BackButton, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import type { AppPageProps } from "./types";
import { Gamepad2, Play } from "lucide-react";
import { DuelWidget } from "@/components/duel-widget";
import type { SubjectId } from "@shared/types";
import { gameDescription } from "@/lib/game-copy";

const unavailableGames: Partial<Record<SubjectId, ReadonlySet<string>>> = {
  english: new Set(["truth"]),
};

export const GamesPage = ({ meta }: AppPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = searchParams.get("subject") === "management" ? "management" : searchParams.get("subject") === "economics" ? "economics" : searchParams.get("subject") === "english" ? "english" : "it-design";
  const games = meta?.games.filter((game) => !unavailableGames[subject]?.has(game.key)) ?? [];
  return (
    <div className="space-y-6">
      <TitleBlock
        eyebrow="Мини-игры"
        title="Быстрое закрепление без скуки"
        description="Каждая игра использует ту же локальную базу вопросов, но подает её в другом темпе и с другой механикой."
      />
      <div className="mb-2">
        <BackButton to="/" />
      </div>

      <div id="duel" className="scroll-mt-24">
        <DuelWidget leaderboard={(meta?.leaderboard ?? []).map((entry) => ({ id: entry.id, name: entry.name, avatarUrl: entry.avatarUrl, lastSeenAt: entry.lastSeenAt }))} />
      </div>

      <Panel>
        <div className="mb-5 grid gap-2 sm:grid-cols-4">
          <button type="button" onClick={() => setSearchParams({ subject: "it-design" })} className={subject === "it-design" ? "rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-left text-white" : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}>Игры по ИТ и графике</button>
          <button type="button" onClick={() => setSearchParams({ subject: "management" })} className={subject === "management" ? "rounded-2xl border border-cyan-300/40 bg-cyan-400/15 px-4 py-3 text-left text-white" : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}>Игры по менеджменту</button>
          <button type="button" onClick={() => setSearchParams({ subject: "economics" })} className={subject === "economics" ? "rounded-2xl border border-emerald-300/40 bg-emerald-400/15 px-4 py-3 text-left text-white" : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}>Игры по экономике</button>
          <button type="button" onClick={() => setSearchParams({ subject: "english" })} className={subject === "english" ? "rounded-2xl border border-rose-300/40 bg-rose-400/15 px-4 py-3 text-left text-white" : "rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-slate-300 transition hover:bg-white/10"}>Игры по английскому</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <Link key={game.key} to={`/games/${game.key}?subject=${subject}`}>
              <GlassCard className="group h-full transition duration-200 hover:-translate-y-1 hover:border-cyan-300/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">{game.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{gameDescription(game.key, subject, game.description)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-300 transition group-hover:scale-105">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                  <Play className="h-4 w-4" />
                  Играть сейчас
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
};

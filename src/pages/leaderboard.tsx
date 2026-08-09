import { Award, Crown, Medal, MessageCircle, Trophy, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { getPresence } from "@/lib/presence";
import { countLabel, formatXp } from "@/lib/utils";
import type { AppPageProps } from "./types";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-300" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-orange-300" />;
  return <span className="w-5 text-center text-sm text-slate-500">{rank}</span>;
};

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

export const LeaderboardPage = ({ meta, profileName }: AppPageProps) => (
  <div className="space-y-6">
    <TitleBlock
      eyebrow="Рейтинг"
      title="Таблица лидеров"
      description="Место определяется количеством XP. Решайте тесты, повышайте точность и поднимайтесь выше."
      right={<BackButton to="/" />}
    />
    <Panel>
      <div className="mb-5 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-200"><Trophy className="h-5 w-5" /></div>
        <div>
          <div className="font-semibold text-white">Общий рейтинг</div>
          <div className="text-sm text-slate-400">Ваш профиль: {profileName}</div>
        </div>
      </div>
      <div className="space-y-3">
        {meta?.leaderboard.length ? meta.leaderboard.map((entry) => {
          const isCurrent = entry.name === profileName;
          const presence = getPresence(entry.lastSeenAt);
          return (
            <GlassCard key={entry.id} className={isCurrent ? "border-cyan-300/35 bg-cyan-400/10" : ""}>
              <div className="grid items-center gap-3 sm:grid-cols-[76px_minmax(0,1fr)_auto_auto_auto]">
                <div className="flex items-center gap-2">
                  {rankIcon(entry.rank)}
                  <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white">
                    {entry.avatarUrl ? <img src={entry.avatarUrl} alt={`Аватар ${entry.name}`} className="h-full w-full object-cover" /> : initials(entry.name) || <UserRound className="h-4 w-4" />}
                  </div>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    {entry.name}
                    {isCurrent ? <Badge tone="cyan">Это вы</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{countLabel(entry.attempts, "тест", "теста", "тестов")} · точность {entry.accuracy}% · серия {entry.streak}</div>
                  <div className={presence.online ? "mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-400" : "mt-1.5 flex items-center gap-1.5 text-xs text-slate-500"}>
                    <span className={presence.online ? "h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "h-2 w-2 rounded-full bg-slate-500"} />
                    {presence.label}
                  </div>
                </div>
                <Badge tone="violet">Уровень {entry.level}</Badge>
                <div className="text-right text-lg font-semibold text-cyan-200">{formatXp(entry.xp)} XP</div>
                {isCurrent ? null : (
                  <Link to={`/messages/${entry.id}`}>
                    <Button variant="secondary" className="w-full sm:w-auto">
                      <MessageCircle className="h-4 w-4" />
                      Написать
                    </Button>
                  </Link>
                )}
              </div>
            </GlassCard>
          );
        }) : (
          <GlassCard className="py-10 text-center">
            <div className="font-semibold text-white">В рейтинге пока никого нет</div>
            <div className="mt-2 text-sm text-slate-400">Зарегистрируйтесь и завершите тест, чтобы стать первым участником.</div>
          </GlassCard>
        )}
      </div>
    </Panel>
  </div>
);

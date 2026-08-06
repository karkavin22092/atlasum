import { Award, Crown, Medal, MessageCircle, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import type { AppPageProps } from "./types";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-300" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-orange-300" />;
  return <span className="w-5 text-center text-sm text-slate-500">{rank}</span>;
};

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
          return (
            <GlassCard key={entry.id} className={isCurrent ? "border-cyan-300/35 bg-cyan-400/10" : ""}>
              <div className="grid items-center gap-3 sm:grid-cols-[44px_1fr_auto_auto_auto]">
                <div className="flex items-center gap-2">{rankIcon(entry.rank)}</div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    {entry.name}
                    {isCurrent ? <Badge tone="cyan">Это вы</Badge> : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{entry.attempts} тестов · точность {entry.accuracy}% · серия {entry.streak}</div>
                </div>
                <Badge tone="violet">Уровень {entry.level}</Badge>
                <div className="text-right text-lg font-semibold text-cyan-200">{entry.xp} XP</div>
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

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Crown, Medal, MessageCircle, ShieldBan, Trophy, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { getPresence } from "@/lib/presence";
import { countLabel, formatXp, levelLabel } from "@/lib/utils";
import { banAccount, getBannedAccounts, unbanAccount, useAuth } from "@/lib/auth";
import { getMessageAccess } from "@/lib/message-access";
import { isAdminUser } from "@/lib/permissions";
import type { AppPageProps } from "./types";

const rankIcon = (rank: number) => {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-300" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Award className="h-5 w-5 text-orange-300" />;
  return <span className="w-5 text-center text-sm text-slate-500">{rank}</span>;
};

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

type LeaderboardEntry = NonNullable<AppPageProps["meta"]>["leaderboard"][number];

const MessageEntryButton = ({ entry }: { entry: LeaderboardEntry }) => {
  const { user } = useAuth();
  const accessQuery = useQuery({
    queryKey: ["message-access", user?.id, entry.id],
    queryFn: () => getMessageAccess(user!.id, entry.id, user!.authToken ?? ""),
    enabled: Boolean(user),
    retry: 0,
  });
  if (!user) return <Link to="/auth"><Button variant="secondary" className="w-full sm:w-auto"><MessageCircle className="h-4 w-4" />Написать</Button></Link>;
  const access = accessQuery.data;
  const label = access?.blockedByMe ? "Вы заблокировали" : access?.blockedByOther ? "Вы были заблокированы" : access?.outgoingRequest ? "Дождитесь решения" : access?.status === "declined" ? "Доступ отклонён" : access?.canWrite ? "Написать" : "Запросить доступ";
  return <Link to={`/messages/${entry.id}`}><Button variant={access?.blockedByOther || access?.status === "declined" ? "ghost" : "secondary"} className="w-full sm:w-auto"><MessageCircle className="h-4 w-4" />{label}</Button></Link>;
};

export const LeaderboardPage = ({ meta, profileName }: AppPageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const admin = isAdminUser(user);
  const authToken = user?.authToken ?? "";
  const [banTarget, setBanTarget] = useState<LeaderboardEntry | null>(null);
  const [banReason, setBanReason] = useState("Неподходящее имя в профиле");
  const [adminError, setAdminError] = useState("");
  const [adminPending, setAdminPending] = useState(false);
  const bannedQuery = useQuery({ queryKey: ["banned-accounts", authToken], queryFn: () => getBannedAccounts(authToken), enabled: admin && Boolean(authToken), retry: 0 });
  const confirmBan = async () => {
    if (!banTarget || !authToken) return;
    setAdminPending(true); setAdminError("");
    try {
      await banAccount(banTarget.id, banReason, authToken);
      setBanTarget(null);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["banned-accounts", authToken] }), queryClient.invalidateQueries({ queryKey: ["meta"] })]);
    } catch (error) { setAdminError(error instanceof Error ? error.message : "Не удалось заблокировать пользователя"); } finally { setAdminPending(false); }
  };
  const restoreAccount = async (id: string) => {
    if (!authToken) return;
    setAdminPending(true); setAdminError("");
    try {
      await unbanAccount(id, authToken);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["banned-accounts", authToken] }), queryClient.invalidateQueries({ queryKey: ["meta"] })]);
    } catch (error) { setAdminError(error instanceof Error ? error.message : "Не удалось разблокировать пользователя"); } finally { setAdminPending(false); }
  };
  return (
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
      <div className="v27-leaderboard-list space-y-3">
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
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="violet">Уровень {entry.level}</Badge>
                  <span className="text-xs font-medium text-slate-400">{levelLabel(entry.level)}</span>
                </div>
                <div className="text-right text-lg font-semibold text-cyan-200">{formatXp(entry.xp)} XP</div>
                {isCurrent ? null : admin ? <Button variant="danger" className="w-full sm:w-auto" onClick={() => { setBanTarget(entry); setBanReason("Неподходящее имя в профиле"); setAdminError(""); }}><ShieldBan className="h-4 w-4" />Заблокировать</Button> : <MessageEntryButton entry={entry} />}
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
    {admin ? (
      <Panel>
        <div className="mb-3 flex items-center gap-2"><ShieldBan className="h-5 w-5 text-rose-300" /><div className="font-semibold text-white">Заблокированные аккаунты</div></div>
        {adminError ? <div className="mb-3 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{adminError}</div> : null}
        {!bannedQuery.data?.length ? <div className="text-sm text-slate-400">Заблокированных аккаунтов нет.</div> : <div className="max-h-[31rem] space-y-2 overflow-y-auto pr-1">{bannedQuery.data.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3"><div className="min-w-0"><div className="font-medium text-white">{account.name}</div><div className="mt-1 text-xs text-slate-400">{account.banReason}</div></div><Button variant="secondary" disabled={adminPending} onClick={() => void restoreAccount(account.id)}>Разблокировать</Button></div>)}</div>}
      </Panel>
    ) : null}
    {banTarget ? <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/70 p-4"><GlassCard className="w-full max-w-md p-5"><h2 className="text-lg font-semibold text-white">Заблокировать {banTarget.name}?</h2><p className="mt-2 text-sm text-slate-400">Аккаунт исчезнет из рейтинга и чатов, а доступ к сайту будет закрыт.</p><label className="mt-4 block text-sm text-slate-300">Причина<select value={banReason} onChange={(event) => setBanReason(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none"><option>Неподходящее имя в профиле</option><option>Оскорбления или токсичное поведение</option><option>Спам или навязчивые сообщения</option><option>Нарушение правил платформы</option></select></label><div className="mt-5 flex justify-end gap-2"><Button variant="ghost" onClick={() => setBanTarget(null)} disabled={adminPending}>Отмена</Button><Button variant="danger" onClick={() => void confirmBan()} disabled={adminPending}>Заблокировать</Button></div></GlassCard></div> : null}
  </div>
  );
};

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, LoaderCircle, Send, Swords, UserRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, GlassCard, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { getPresence } from "@/lib/presence";
import { acceptDuel, cancelDuel, declineDuel, getDuels, inviteDuel, type Duel } from "@/lib/duels";
import type { SubjectId } from "@shared/types";

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();
const subjectTitle = (subject: SubjectId) => subject === "management" ? "Менеджмент" : subject === "economics" ? "Экономика" : "ИТ и графика";

const PlayerAvatar = ({ player, size = "h-10 w-10" }: { player: { name: string; avatarUrl: string | null }; size?: string }) => (
  <div className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-cyan-400/15 text-xs font-semibold text-cyan-100`}>
    {player.avatarUrl ? <img src={player.avatarUrl} alt={`Аватар ${player.name}`} className="h-full w-full object-cover" /> : initials(player.name) || <UserRound className="h-4 w-4" />}
  </div>
);

export const DuelWidget = ({ leaderboard }: { leaderboard: Array<{ id: string; name: string; avatarUrl: string | null; lastSeenAt: string | null }> }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = user?.authToken ?? "";
  const [subject, setSubject] = useState<SubjectId>("it-design");
  const [selectedOpponent, setSelectedOpponent] = useState("");
  const [error, setError] = useState("");
  const duelsQuery = useQuery({ queryKey: ["duels", user?.id, token], queryFn: () => getDuels(token), enabled: Boolean(user && token), retry: 0, refetchInterval: 5_000 });
  const duels = duelsQuery.data ?? [];
  const onlinePlayers = useMemo(() => leaderboard.filter((entry) => entry.id !== user?.id && getPresence(entry.lastSeenAt).online), [leaderboard, user?.id]);
  const pendingOutgoing = duels.find((duel) => duel.status === "pending" && duel.inviter.id === user?.id);
  const incoming = duels.filter((duel) => duel.status === "pending" && duel.invitee.id === user?.id);
  const active = duels.find((duel) => duel.status === "active");

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["duels"] });
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };
  const inviteMutation = useMutation({ mutationFn: () => inviteDuel(token, selectedOpponent, subject), onSuccess: async () => { setSelectedOpponent(""); await refresh(); }, onError: (caught) => setError(caught instanceof Error ? caught.message : "Не удалось отправить приглашение") });
  const acceptMutation = useMutation({ mutationFn: (id: string) => acceptDuel(token, id), onSuccess: async (duel) => { await refresh(); navigate(`/duels/${duel.id}`); }, onError: (caught) => setError(caught instanceof Error ? caught.message : "Не удалось принять приглашение") });
  const declineMutation = useMutation({ mutationFn: (id: string) => declineDuel(token, id), onSuccess: refresh, onError: (caught) => setError(caught instanceof Error ? caught.message : "Не удалось отклонить приглашение") });
  const cancelMutation = useMutation({ mutationFn: (id: string) => cancelDuel(token, id), onSuccess: refresh, onError: (caught) => setError(caught instanceof Error ? caught.message : "Не удалось отменить приглашение") });

  useEffect(() => {
    if (!pendingOutgoing || !token) return;
    const id = pendingOutgoing.id;
    const cancelOnExit = () => { void cancelDuel(token, id); };
    window.addEventListener("beforeunload", cancelOnExit);
    return () => {
      window.removeEventListener("beforeunload", cancelOnExit);
      void cancelDuel(token, id);
    };
  }, [pendingOutgoing?.id, token]);

  if (!user) return null;

  return (
    <Panel className="border-cyan-300/20 bg-cyan-400/[0.035]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80"><Swords className="h-4 w-4" />1 на 1 онлайн</div>
          <h2 className="mt-2 text-2xl font-semibold text-white">Вызовите соперника</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Два игрока отвечают на 10 случайных вопросов за 10 минут. Победитель получает +150 XP, а проигравший может получить +50 XP за результат выше половины.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"><Clock3 className="h-4 w-4 text-amber-300" />10 вопросов · 10 минут</div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-300">Направление</div>
          <div className="grid grid-cols-2 gap-2">
            {(["it-design", "management", "economics"] as const).map((value) => <button key={value} type="button" onClick={() => setSubject(value)} className={subject === value ? "rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-3 py-2.5 text-left text-sm text-white" : "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left text-sm text-slate-300 hover:bg-white/10"}>{subjectTitle(value)}</button>)}
          </div>
          {pendingOutgoing ? <GlassCard className="border-amber-300/20 bg-amber-400/5"><div className="flex items-center gap-3"><PlayerAvatar player={pendingOutgoing.opponent} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">Ожидаем ответ от {pendingOutgoing.opponent.name}</div><div className="mt-1 text-xs text-slate-400">Если уйти со страницы, приглашение отменится.</div></div><Button variant="ghost" onClick={() => cancelMutation.mutate(pendingOutgoing.id)} disabled={cancelMutation.isPending}><X className="h-4 w-4" />Отменить</Button></div></GlassCard> : null}
          {active ? <Button onClick={() => navigate(`/duels/${active.id}`)}><Swords className="h-4 w-4" />Продолжить игру</Button> : null}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2"><div className="text-sm font-medium text-slate-300">Игроки в сети</div><Badge tone="emerald">{onlinePlayers.length}</Badge></div>
          <div className="space-y-2">
            {onlinePlayers.length ? onlinePlayers.map((player) => <div key={player.id} className={selectedOpponent === player.id ? "flex items-center gap-3 rounded-2xl border border-cyan-300/35 bg-cyan-400/10 p-3" : "flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"}>
              <PlayerAvatar player={player} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{player.name}</div><div className="mt-1 text-xs text-emerald-300">Сейчас онлайн</div></div>
              <Button variant={selectedOpponent === player.id ? "primary" : "secondary"} onClick={() => { setSelectedOpponent(player.id); setError(""); }} disabled={Boolean(pendingOutgoing) || inviteMutation.isPending}><Send className="h-4 w-4" />Вызвать</Button>
            </div>) : <div className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-slate-400">Сейчас нет свободных соперников. Оставьте вкладку открытой.</div>}
          </div>
          {selectedOpponent && !pendingOutgoing ? <Button className="mt-3 w-full sm:w-auto" onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending}>{inviteMutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Отправить приглашение · {subjectTitle(subject)}</Button> : null}
        </div>
      </div>

      {incoming.length ? <div className="mt-5 space-y-2 border-t border-white/10 pt-4"><div className="text-sm font-medium text-slate-300">Входящие приглашения</div>{incoming.map((duel) => <div key={duel.id} className="flex flex-col gap-3 rounded-2xl border border-cyan-300/25 bg-cyan-400/5 p-3 sm:flex-row sm:items-center"><PlayerAvatar player={duel.opponent} /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-white">{duel.opponent.name} вызывает вас</div><div className="mt-1 text-xs text-slate-400">{subjectTitle(duel.subject)} · 10 вопросов · 10 минут</div></div><div className="flex gap-2"><Button onClick={() => acceptMutation.mutate(duel.id)} disabled={acceptMutation.isPending}><Check className="h-4 w-4" />Принять</Button><Button variant="ghost" onClick={() => declineMutation.mutate(duel.id)} disabled={declineMutation.isPending}>Отклонить</Button></div></div>)}</div> : null}
      {error ? <div role="alert" className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}
    </Panel>
  );
};

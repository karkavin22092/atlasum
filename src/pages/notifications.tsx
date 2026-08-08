import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Gift, LoaderCircle, MessageSquareText, Swords, X, XCircle } from "lucide-react";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { getNotifications, markNotificationsRead } from "@/lib/bugs";
import { useAuth } from "@/lib/auth";
import { acceptDuel, declineDuel } from "@/lib/duels";
import { REALTIME_POLL_MS } from "@/lib/realtime";
import type { AppPageProps } from "./types";

const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export const NotificationsPage = ({ meta: _meta, profileName }: AppPageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const userId = user?.id ?? "guest";
  const authToken = user?.authToken ?? "";
  const duelAction = async (id: string, action: "accept" | "decline") => {
    if (!authToken) return;
    await (action === "accept" ? acceptDuel(authToken, id) : declineDuel(authToken, id));
    await queryClient.invalidateQueries({ queryKey: ["notifications", userId, authToken] });
    await queryClient.invalidateQueries({ queryKey: ["duels"] });
    if (action === "accept") navigate(`/duels/${id}`);
  };
  const notificationsQuery = useQuery({
    queryKey: ["notifications", userId, authToken],
    queryFn: () => getNotifications(userId, authToken),
    enabled: Boolean(user && authToken && userId !== "guest"),
    retry: 0,
    refetchInterval: REALTIME_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!user || !authToken || !notificationsQuery.data?.some((notification) => !notification.readAt && notification.type !== "duel-invite")) return;
    void markNotificationsRead(userId, authToken).then(async () => {
      const readAt = new Date().toISOString();
      queryClient.setQueryData(["notifications", userId, authToken], (current: typeof notificationsQuery.data) =>
        current?.map((notification) => notification.readAt ? notification : { ...notification, readAt }));
      await queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["meta", profileName] });
    });
  }, [authToken, notificationsQuery.data, profileName, queryClient, user, userId]);

  if (!user) {
    return <Panel className="text-center"><Bell className="mx-auto h-9 w-9 text-cyan-300" /><div className="mt-4 font-semibold text-white">Войдите, чтобы увидеть уведомления</div><Link to="/auth"><Button className="mt-4">Войти</Button></Link></Panel>;
  }

  return (
    <div className="space-y-6">
      <TitleBlock eyebrow="События" title="Уведомления" description="Здесь появятся ответы на отзывы, результаты рассмотрения предложений и награды." right={<BackButton to="/" />} />
      <Panel>
        {notificationsQuery.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" /></div> : null}
        {notificationsQuery.isError ? <GlassCard className="border-rose-400/25 text-rose-200">Не удалось загрузить уведомления.</GlassCard> : null}
        {!notificationsQuery.isLoading && !(notificationsQuery.data?.length) ? <GlassCard className="py-12 text-center"><CheckCheck className="mx-auto h-10 w-10 text-emerald-400" /><div className="mt-4 font-semibold text-white">Новых событий пока нет</div></GlassCard> : null}
        <div className="space-y-3">
          {notificationsQuery.data?.map((notification) => {
            const reviewEvent = notification.type === "review-new" || notification.type === "review-reply";
            const duelEvent = notification.type.startsWith("duel-");
            const duelInvite = notification.type === "duel-invite";
            return (
            <GlassCard key={notification.id} className={!notification.readAt ? "border-cyan-300/30 bg-cyan-400/10" : ""}>
              <div className="flex items-start gap-4">
                <div className={reviewEvent || duelEvent ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-300" : notification.xpAwarded > 0 ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300" : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-400/15 text-rose-300"}>
                  {reviewEvent ? <MessageSquareText className="h-5 w-5" /> : duelEvent ? <Swords className="h-5 w-5" /> : notification.xpAwarded > 0 ? <Gift className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><div className="font-semibold text-white">{notification.title}</div>{!notification.readAt ? <Badge tone="cyan">Новое</Badge> : null}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{notification.message}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {reviewEvent ? <Link to="/#reviews" className="text-sm font-medium text-cyan-200 hover:text-cyan-100">Открыть отзывы</Link> : duelInvite ? <><Button onClick={() => void duelAction(notification.bugId, "accept")}><Check className="h-4 w-4" />Принять</Button><Button variant="ghost" onClick={() => void duelAction(notification.bugId, "decline")}><X className="h-4 w-4" />Отклонить</Button></> : duelEvent ? <Link to={`/duels/${notification.bugId}`} className="text-sm font-medium text-cyan-200 hover:text-cyan-100">Открыть игру</Link> : notification.xpAwarded > 0 ? <Badge tone="amber">+{notification.xpAwarded} XP</Badge> : <Badge tone="rose">Без награды</Badge>}
                    <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          );})}
        </div>
      </Panel>
    </div>
  );
};

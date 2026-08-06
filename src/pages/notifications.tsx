import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Gift, LoaderCircle, XCircle } from "lucide-react";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { getNotifications, markNotificationsRead } from "@/lib/bugs";
import { useAuth } from "@/lib/auth";
import type { AppPageProps } from "./types";

const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export const NotificationsPage = ({ meta: _meta, profileName }: AppPageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "guest";
  const authToken = user?.authToken ?? "";
  const notificationsQuery = useQuery({
    queryKey: ["notifications", userId, authToken],
    queryFn: () => getNotifications(userId, authToken),
    enabled: Boolean(user && authToken && userId !== "guest"),
    retry: 0,
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!user || !authToken || !notificationsQuery.data?.some((notification) => !notification.readAt)) return;
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
      <TitleBlock eyebrow="События" title="Уведомления" description="Здесь появятся результаты рассмотрения обращений и начисленные награды." right={<BackButton to="/" />} />
      <Panel>
        {notificationsQuery.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" /></div> : null}
        {notificationsQuery.isError ? <GlassCard className="border-rose-400/25 text-rose-200">Не удалось загрузить уведомления.</GlassCard> : null}
        {!notificationsQuery.isLoading && !(notificationsQuery.data?.length) ? <GlassCard className="py-12 text-center"><CheckCheck className="mx-auto h-10 w-10 text-emerald-400" /><div className="mt-4 font-semibold text-white">Новых событий пока нет</div></GlassCard> : null}
        <div className="space-y-3">
          {notificationsQuery.data?.map((notification) => (
            <GlassCard key={notification.id} className={!notification.readAt ? "border-cyan-300/30 bg-cyan-400/10" : ""}>
              <div className="flex items-start gap-4">
                <div className={notification.type === "bug-fixed" ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300" : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-400/15 text-rose-300"}>
                  {notification.type === "bug-fixed" ? <Gift className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><div className="font-semibold text-white">{notification.title}</div>{!notification.readAt ? <Badge tone="cyan">Новое</Badge> : null}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-300">{notification.message}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {notification.xpAwarded > 0 ? <Badge tone="amber">+{notification.xpAwarded} XP</Badge> : <Badge tone="rose">Без награды</Badge>}
                    <span className="text-xs text-slate-500">{formatDate(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </Panel>
    </div>
  );
};

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Ban, CheckCircle2, ExternalLink, Gift, Lightbulb, LoaderCircle, XCircle } from "lucide-react";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import { acceptFeedback, formatFeedbackPage, getFeedbackReports, markFeedbackReportsRead, rejectFeedback } from "@/lib/bugs";
import { useAuth } from "@/lib/auth";
import { isAdminUser } from "@/lib/permissions";
import type { AppPageProps } from "./types";

const formatDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));

export const BugsPage = ({ meta: _meta }: AppPageProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const adminId = user?.id ?? "";
  const allowed = isAdminUser(user);
  const authToken = user?.authToken ?? "";
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const reportsQuery = useQuery({
    queryKey: ["feedback-reports", adminId, authToken],
    queryFn: () => getFeedbackReports(adminId, authToken),
    enabled: allowed && Boolean(authToken),
    retry: 0,
    refetchInterval: 15_000,
  });
  const acceptMutation = useMutation({
    mutationFn: (reportId: string) => acceptFeedback(adminId, reportId, authToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feedback-reports"] });
      await queryClient.invalidateQueries({ queryKey: ["unread-feedback"] });
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ reportId, reason }: { reportId: string; reason: string }) => rejectFeedback(adminId, reportId, reason, authToken),
    onSuccess: async () => {
      setRejectingId(null);
      await queryClient.invalidateQueries({ queryKey: ["feedback-reports"] });
      await queryClient.invalidateQueries({ queryKey: ["unread-feedback"] });
    },
  });

  useEffect(() => {
    if (!allowed || !authToken || !reportsQuery.data?.some((report) => !report.adminReadAt)) return;
    void markFeedbackReportsRead(adminId, authToken).then(() => queryClient.invalidateQueries({ queryKey: ["unread-feedback"] }));
  }, [adminId, allowed, authToken, queryClient, reportsQuery.data]);

  if (!allowed) return <Navigate to="/" replace />;
  const reports = [...(reportsQuery.data ?? [])].sort((left, right) => Number(left.status !== "open") - Number(right.status !== "open") || right.createdAt.localeCompare(left.createdAt));

  return (
    <div className="space-y-6">
      <TitleBlock eyebrow="Администратор" title="Предложения" description="Баги и идеи пользователей в одном окне. За исправленный баг начисляется 200 XP, за принятое улучшение — 300 XP." right={<BackButton to="/" />} />
      <Panel>
        {reportsQuery.isLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" /></div> : null}
        {reportsQuery.isError ? <GlassCard className="border-rose-400/25 text-rose-200">Не удалось загрузить обращения. Попробуйте обновить страницу.</GlassCard> : null}
        {acceptMutation.isError ? <GlassCard className="mb-4 border-rose-400/25 text-rose-200">{acceptMutation.error instanceof Error ? acceptMutation.error.message : "Не удалось принять обращение"}</GlassCard> : null}
        {rejectMutation.isError ? <GlassCard className="mb-4 border-rose-400/25 text-rose-200">{rejectMutation.error instanceof Error ? rejectMutation.error.message : "Не удалось отклонить обращение"}</GlassCard> : null}
        {!reportsQuery.isLoading && !reports.length ? <GlassCard className="py-12 text-center"><Lightbulb className="mx-auto h-10 w-10 text-cyan-300" /><div className="mt-4 font-semibold text-white">Новых предложений пока нет</div></GlassCard> : null}
        <div className="space-y-4">
          {reports.map((report) => (
            <GlassCard key={report.id} className={report.status === "open" ? "border-amber-300/25" : "opacity-80"}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={report.kind === "improvement" ? "amber" : "rose"}>
                      {report.kind === "improvement" ? "Улучшение" : "Баг"}
                    </Badge>
                    <Badge tone={report.status === "fixed" || report.status === "accepted" ? "emerald" : report.status === "rejected" ? "rose" : "amber"}>
                      {report.status === "fixed" ? "Исправлено" : report.status === "accepted" ? "Принято" : report.status === "rejected" ? "Отклонено" : "Ожидает"}
                    </Badge>
                    <span className="text-xs text-slate-500">{formatDate(report.createdAt)}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-white">{report.title}</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{report.description}</p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span>Автор: <strong className="text-slate-300">{report.reporterName}</strong></span>
                    <span className="inline-flex items-center gap-1" title={report.pageUrl || undefined}><ExternalLink className="h-3.5 w-3.5" />{formatFeedbackPage(report.pageUrl)}</span>
                    {report.fixedAt ? <span>Исправлено: {formatDate(report.fixedAt)}</span> : null}
                    {report.acceptedAt ? <span>Принято: {formatDate(report.acceptedAt)}</span> : null}
                    {report.rejectedAt ? <span>Отклонено: {formatDate(report.rejectedAt)}</span> : null}
                  </div>
                  {report.rejectionReason ? <div className="mt-3 rounded-xl border border-rose-400/15 bg-rose-400/5 px-3 py-2 text-sm text-rose-200">Причина: {report.rejectionReason}</div> : null}
                </div>
                {report.status === "open" ? (
                  <div className="w-full shrink-0 space-y-2 lg:w-auto">
                    <Button onClick={() => acceptMutation.mutate(report.id)} disabled={acceptMutation.isPending || rejectMutation.isPending} className="w-full">
                      {acceptMutation.isPending && acceptMutation.variables === report.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {report.kind === "improvement" ? "Принять улучшение" : "Отметить исправленным"}
                    </Button>
                    <Button variant="secondary" onClick={() => setRejectingId((current) => current === report.id ? null : report.id)} disabled={acceptMutation.isPending || rejectMutation.isPending} className="w-full">
                      <XCircle className="h-4 w-4" />Отклонить
                    </Button>
                    {rejectingId === report.id ? (
                      <div className="space-y-2 rounded-2xl border border-rose-400/20 bg-rose-400/5 p-3">
                        <div className="text-xs text-slate-400">Укажите причину:</div>
                        <button type="button" onClick={() => rejectMutation.mutate({ reportId: report.id, reason: report.kind === "improvement" ? "Предложение не подходит проекту" : "Баг не подтверждён" })} className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10">
                          {report.kind === "improvement" ? "Не подходит проекту" : "Баг не подтверждён"}
                        </button>
                        <button type="button" onClick={() => rejectMutation.mutate({ reportId: report.id, reason: "Некорректная заявка" })} className="w-full rounded-xl border border-white/10 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/10">Некорректная заявка</button>
                      </div>
                    ) : null}
                  </div>
                ) : report.status === "fixed" || report.status === "accepted" ? (
                  <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300"><Gift className="h-4 w-4" />{report.kind === "improvement" ? 300 : 200} XP начислено</div>
                ) : (
                  <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-rose-400/10 px-4 py-3 text-sm text-rose-300"><Ban className="h-4 w-4" />Без начисления XP</div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </Panel>
    </div>
  );
};

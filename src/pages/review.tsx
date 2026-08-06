import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BackButton, Badge, Button, GlassCard, Panel, ProgressBar, TitleBlock } from "@/components/ui";
import { Link } from "react-router-dom";
import type { AppPageProps } from "./types";

export const ReviewPage = ({ profileName, meta }: AppPageProps) => {
  const reviewQuery = useQuery({
    queryKey: ["reviews", profileName],
    queryFn: () => api.reviews(profileName),
  });

  const reviews = reviewQuery.data ?? [];

  return (
    <div className="space-y-6">
      <TitleBlock
        eyebrow="Повторение"
        title="Только то, что стоит увидеть снова"
        description="Здесь собраны вопросы по интервальному повторению, с низкой точностью и из слабых зон."
        right={<Link to="/practice?mode=review"><Button>Запустить повторение</Button></Link>}
      />
      <div className="mb-2">
        <BackButton to="/" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Вопросов</div>
          <div className="mt-2 text-3xl font-semibold text-white">{reviews.length}</div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Темы</div>
          <div className="mt-2 text-3xl font-semibold text-white">{new Set(reviews.map((item) => item.topic)).size}</div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Средняя точность</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            {reviews.length ? Math.round((reviews.reduce((sum, item) => sum + item.accuracy, 0) / reviews.length) * 10) / 10 : 0}%
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Нужно повторить</div>
          <div className="mt-2 text-3xl font-semibold text-white">{meta?.stats.reviewDue ?? 0}</div>
        </GlassCard>
      </div>

      <Panel>
        <div className="space-y-3">
          {reviews.slice(0, 24).map((review) => (
            <GlassCard key={review.questionId}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="cyan">{review.topic}</Badge>
                    <Badge tone={review.difficulty === "hard" ? "rose" : review.difficulty === "medium" ? "amber" : "emerald"}>
                      {review.difficulty}
                    </Badge>
                    <Badge tone="violet">{Math.round(review.mastery * 100)}% освоено</Badge>
                  </div>
                  <div className="text-base font-medium text-white">{review.question}</div>
                  <div className="text-sm text-slate-400">Точность: {review.accuracy}% | Ответов: {review.timesAnswered}</div>
                  <div className="max-w-3xl">
                    <ProgressBar value={review.mastery * 100} />
                  </div>
                </div>
                <Link to="/practice?mode=review">
                  <Button variant="secondary">Повторить</Button>
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      </Panel>
    </div>
  );
};

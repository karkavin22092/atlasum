import { CheckCircle2, Sparkles } from "lucide-react";
import { BackButton, Badge, GlassCard, TitleBlock } from "@/components/ui";
import { APP_VERSION } from "@/lib/version";
import type { AppPageProps } from "./types";

const releases = [
  {
    version: "2.0",
    date: "7 августа 2026",
    current: true,
    title: "Синхронизированные онлайн-дуэли",
    items: [
      "Добавлен отдельный режим 1 на 1: можно пригласить игрока, который сейчас онлайн, и выбрать ИТ/графику или менеджмент.",
      "Оба участника получают один случайный набор из 10 вопросов и 10 минут на прохождение; ответы проверяются на сервере.",
      "Победитель получает +150 XP, а проигравший получает +50 XP только при результате больше половины правильных ответов.",
      "Приглашение отменяется при выходе приглашающего, а досрочный выход соперника засчитывается как поражение с аннулированием ответов.",
      "В уведомлениях отображаются приглашения, принятие, отмена и результат дуэли; блиц теперь даёт 25 секунд на каждый вопрос.",
      "Добавлено направление «Экономика»: три раздела и 1000 вопросов с пояснениями, статистикой, отчётами, практикой и всеми мини-играми.",
    ],
  },
  {
    version: "1.9",
    date: "7 августа 2026",
    current: false,
    title: "Единая синхронизация профилей",
    items: [
      "Добавлена вкладка «Что нового?» с историей обновлений.",
      "Аватары теперь хранятся в общем профиле и отображаются на всех устройствах.",
      "Фото пользователей показываются в лидерборде и личных чатах.",
      "Добавлены обновления интерфейса и более понятная навигация по профилю.",
    ],
  },
  {
    version: "1.8",
    date: "6 августа 2026",
    current: false,
    title: "Отзывы и обратная связь",
    items: [
      "Добавлен блок отзывов пользователей на главной странице.",
      "Можно поставить оценку звёздами, выбрать достоинства и недостатки, добавить эмодзи и изображения.",
      "Один аккаунт может публиковать один отзыв и менять его в любое время.",
      "Создатель может отвечать на отзывы, а пользователи получают уведомления об ответах.",
      "В подвал добавлены контакты создателя: Telegram, VK и электронная почта.",
      "Добавлена загрузка и удаление аватара из меню профиля.",
    ],
  },
];

export const WhatsNewPage = ({ meta: _meta }: AppPageProps) => (
  <div className="space-y-6">
    <TitleBlock
      eyebrow="Обновления"
      title="Что нового?"
      description={`История изменений Examora. Сейчас установлена версия ${APP_VERSION}.`}
      right={<BackButton to="/" />}
    />
    <div className="space-y-4">
      {releases.map((release) => (
        <article key={release.version} className={release.current ? "glass-strong rounded-3xl border-cyan-300/30 p-5 shadow-glow sm:p-6" : "glass rounded-3xl p-5 sm:p-6"}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={release.current ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-400/15 text-cyan-200" : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-slate-300"}>
                {release.current ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold text-white">Версия {release.version}</h2>{release.current ? <Badge tone="cyan">Текущая</Badge> : null}</div>
                <div className="mt-1 text-sm text-slate-500">{release.date}</div>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-300">{release.title}</div>
          </div>
          <ul className="mt-5 space-y-3 border-t border-white/10 pt-5">
            {release.items.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />{item}</li>)}
          </ul>
        </article>
      ))}
    </div>
  </div>
);

import type { ReactNode } from "react";
import { BackButton, GlassCard, TitleBlock } from "@/components/ui";

const PolicySection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="border-t border-white/10 py-5 first:border-t-0 first:pt-0">
    <h2 className="text-base font-semibold text-white">{title}</h2>
    <div className="mt-2 space-y-2 text-sm leading-6 text-slate-300">{children}</div>
  </section>
);

export const PrivacyPage = () => (
  <div className="space-y-6">
    <TitleBlock
      eyebrow="Документы"
      title="Политика конфиденциальности"
      description="Актуальна с 11 августа 2026 года."
      right={<BackButton to="/">На главную</BackButton>}
    />

    <GlassCard className="max-w-4xl p-5 sm:p-7">
      <PolicySection title="О политике">
        <p>Эта политика объясняет, какие данные использует Атласум и зачем они нужны для работы учебной платформы.</p>
      </PolicySection>
      <PolicySection title="Какие данные обрабатываются">
        <p>При регистрации сохраняются имя в профиле, адрес электронной почты и пароль в защищённом виде. Также могут храниться добавленный вами аватар, выбранный цвет интерфейса, результаты тестов, XP, прогресс, достижения, сообщения и обращения в поддержку.</p>
      </PolicySection>
      <PolicySection title="Зачем это нужно">
        <p>Данные нужны для создания аккаунта, сохранения прогресса между устройствами, отображения рейтинга, работы личных сообщений, обращений и защиты платформы от ошибок и злоупотреблений.</p>
      </PolicySection>
      <PolicySection title="Что видят другие пользователи">
        <p>В рейтинге и чатах могут быть видны ваше имя, аватар, уровень и XP. Адрес электронной почты публично не отображается.</p>
      </PolicySection>
      <PolicySection title="Хранение и передача">
        <p>Данные хранятся в инфраструктуре, которую использует сайт, и не передаются рекламодателям. Локальные настройки могут дополнительно сохраняться в браузере, чтобы интерфейс открывался в выбранном виде.</p>
      </PolicySection>
      <PolicySection title="Ваши права">
        <p>Вы можете изменить данные профиля и аватар. Чтобы запросить удаление аккаунта и связанных с ним данных, напишите создателю проекта: <a className="text-cyan-200 underline underline-offset-2" href="mailto:lonexnesss@mail.ru">lonexnesss@mail.ru</a>.</p>
      </PolicySection>
      <PolicySection title="Изменения политики">
        <p>При существенном изменении этой политики актуальная версия будет опубликована на этой странице.</p>
      </PolicySection>
    </GlassCard>
  </div>
);

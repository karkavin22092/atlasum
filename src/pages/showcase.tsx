import { ArrowUpRight, BookOpen, Check, ChevronRight, Gamepad2, GraduationCap, LayoutGrid, MessageCircle, Sparkles, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME, APP_VERSION } from "@/lib/version";

const routes = [
  { number: "01", title: "Экзамен", text: "Системная проверка знаний за один сеанс", icon: GraduationCap, tone: "bg-cyan-300 text-slate-950" },
  { number: "02", title: "Свободная практика", text: "Темы, режимы и повторение слабых мест", icon: LayoutGrid, tone: "bg-amber-300 text-slate-950" },
  { number: "03", title: "Нашелинго", text: "Пошаговый маршрут с уровнями и теорией", icon: BookOpen, tone: "bg-emerald-300 text-slate-950" },
  { number: "04", title: "Мини-игры", text: "Короткие игровые форматы для закрепления", icon: Gamepad2, tone: "bg-rose-300 text-slate-950" },
];

const disciplines = ["ИТ и дизайн", "Менеджмент", "Экономика", "Английский язык"];

export const ShowcasePage = () => (
  <main className="showcase-page min-h-screen overflow-hidden bg-[#07131c] text-[#f4f7f8] selection:bg-cyan-300 selection:text-slate-950">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_92%_88%,rgba(139,92,246,0.14),transparent_30%)]" aria-hidden="true" />

    <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col px-5 py-5 sm:px-8 sm:py-8 lg:px-12 lg:py-10">
      <header className="flex items-center justify-between border-b border-white/15 pb-5">
        <Link to="/" className="group flex items-center gap-3" aria-label="Открыть Атласум">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-violet-500 text-white shadow-[0_0_24px_rgba(56,189,248,0.28)] transition group-hover:brightness-110">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.26em]">{APP_NAME}</span>
            <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em] text-cyan-100/60">learning platform · {APP_VERSION}</span>
          </span>
        </Link>
        <div className="hidden items-center gap-5 text-xs uppercase tracking-[0.2em] text-slate-400 sm:flex">
          <span>Product overview</span>
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          <span>2026</span>
        </div>
        <Link to="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-200 backdrop-blur-xl transition hover:border-cyan-200/50 hover:bg-white/10 hover:text-cyan-100 sm:px-4">
          Открыть сайт <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1.05fr)] lg:gap-20 lg:py-16">
        <div className="max-w-2xl">
          <div className="mb-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200/80">
            <span className="h-px w-10 bg-cyan-300" />
            Цифровая среда обучения
          </div>
          <h1 className="max-w-xl text-6xl font-semibold leading-[0.95] tracking-[-0.045em] sm:text-8xl lg:text-[clamp(5rem,8vw,8.4rem)]">
            Учиться<br /><span className="text-cyan-200">системно.</span>
          </h1>
          <p className="mt-8 max-w-lg text-lg leading-8 text-slate-300 sm:text-xl">
            {APP_NAME} превращает подготовку в понятный маршрут: от первого вопроса до устойчивого навыка, который видно в прогрессе.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_0_24px_rgba(56,189,248,0.24)] transition hover:brightness-110">
              Перейти к обучению <ChevronRight className="h-4 w-4" />
            </Link>
            <span className="inline-flex items-center gap-2 px-2 py-3 text-sm text-slate-400"><Check className="h-4 w-4 text-emerald-300" /> 4 дисциплины · единый прогресс</span>
          </div>
        </div>

        <div className="relative lg:pl-4">
          <div className="mb-3 flex items-end justify-between border-b border-white/15 pb-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Учебный маршрут</div>
              <div className="mt-1 text-2xl font-medium tracking-tight text-white">Выберите свой темп</div>
            </div>
            <span className="font-mono text-xs text-cyan-200/70">ATLASUM / 01</span>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] px-4 shadow-2xl backdrop-blur-xl sm:px-6">
            {routes.map(({ number, title, text, icon: Icon, tone }, index) => (
              <div key={title} className="group grid grid-cols-[46px_42px_minmax(0,1fr)_20px] items-center gap-3 border-b border-white/10 py-5 last:border-0 sm:grid-cols-[58px_48px_minmax(0,1fr)_24px] sm:gap-4 sm:py-6">
                <span className="font-mono text-sm text-slate-500">{number}</span>
                <span className={`grid h-10 w-10 place-items-center rounded-2xl transition group-hover:rotate-3 sm:h-11 sm:w-11 ${tone}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{index < 2 ? "Practice" : index === 2 ? "Path" : "Play"}</span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-4">
            {disciplines.map((discipline) => <div key={discipline} className="text-xs leading-5 text-slate-400"><span className="mb-1 block h-1 w-6 bg-cyan-300/70" />{discipline}</div>)}
          </div>
        </div>
      </section>

      <footer className="grid gap-6 border-t border-white/15 pt-5 text-xs text-slate-500 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-wrap gap-x-7 gap-y-2 uppercase tracking-[0.16em]">
          <span>Теория</span><span>Практика</span><span>История попыток</span><span>Рейтинг</span>
        </div>
        <div className="flex items-center gap-4 sm:justify-end"><MessageCircle className="h-4 w-4 text-cyan-200/70" /> Связанные сценарии, один профиль</div>
      </footer>
    </div>
  </main>
);

import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Button, Panel } from "@/components/ui";
import type { EnglishTenseTheory } from "@/lib/english-tense-theory";

export const EnglishTenseTheory = ({
  theory,
  page,
  onPageChange,
  onStart,
  onClose,
}: {
  theory: EnglishTenseTheory;
  page: number;
  onPageChange: (page: number) => void;
  onStart: () => void;
  onClose: () => void;
}) => {
  const formulaHint = theory.formula.includes("past participle")
    ? "Past participle — третья форма глагола: worked у правильных глаголов и gone, written, built у неправильных."
    : theory.formula.includes("verb-ing")
      ? "Verb-ing — форма глагола с окончанием -ing: work → working, study → studying."
      : theory.formula.includes("base verb")
        ? "Base verb — начальная форма глагола без to и без окончания: work, study, go."
        : "В формуле указаны вспомогательные глаголы и форма смыслового глагола, которые нужно поставить в этом порядке.";
  const pages = [
    { title: "Когда используется", content: <p className="text-sm leading-7 text-slate-300">{theory.purpose}</p> },
    { title: "Формула и маркеры", content: <div className="space-y-4"><div className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/10 px-4 py-3 font-mono text-sm text-fuchsia-100">{theory.formula}</div><p className="text-sm leading-7 text-slate-300">{formulaHint}</p><p className="text-sm leading-7 text-slate-300">Частые подсказки: <span className="text-white">{theory.signalWords}</span>.</p></div> },
    { title: "Примеры", content: <div className="space-y-3">{theory.examples.map((example) => <div key={example.english} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><div className="text-sm font-medium text-white">{example.english}</div><div className="mt-1 text-sm text-slate-400">{example.russian}</div></div>)}</div> },
    { title: "На что обратить внимание", content: <ul className="space-y-3 text-sm leading-6 text-slate-300">{theory.mistakes.map((mistake) => <li key={mistake} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-fuchsia-300" />{mistake}</li>)}</ul> },
  ];
  const current = pages[page];

  return (
    <Panel className="mx-auto w-full max-w-2xl border-fuchsia-300/20 bg-fuchsia-400/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-200/80"><BookOpen className="h-4 w-4" />Короткая теория</div><h2 className="mt-2 text-2xl font-semibold text-white">{theory.title}</h2></div>
        <span className="shrink-0 text-xs text-slate-400">{page + 1}/{pages.length}</span>
      </div>
      <div className="mt-6 max-h-[min(430px,calc(100vh-280px))] overflow-y-auto pr-1"><h3 className="text-lg font-semibold text-white">{current.title}</h3><div className="mt-4">{current.content}</div></div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onClose}>К настройкам</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => onPageChange(page - 1)} disabled={page === 0}><ArrowLeft className="h-4 w-4" />Назад</Button>
          {page < pages.length - 1 ? <Button onClick={() => onPageChange(page + 1)}>Далее<ArrowRight className="h-4 w-4" /></Button> : <Button onClick={onStart}>Начать 10 вопросов<ArrowRight className="h-4 w-4" /></Button>}
        </div>
      </div>
    </Panel>
  );
};

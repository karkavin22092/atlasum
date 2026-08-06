import type { Question } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { Button, GlassCard } from "./ui";
import { cn, shuffleArray } from "@/lib/utils";
import { Check, GripVertical, Minus, Plus } from "lucide-react";

export type AnswerValue = string | string[] | boolean | { left: string; right: string }[];

type Props = {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  locked?: boolean;
};

const optionClasses = (selected: boolean, correct?: boolean) =>
  cn(
    "w-full rounded-2xl border px-4 py-3 text-left transition",
    selected
      ? "border-cyan-300/40 bg-cyan-400/15 text-white shadow-glow"
      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10",
    correct ? "ring-2 ring-emerald-400/30" : "",
  );

export const QuestionRenderer = ({ question, value, onChange, locked }: Props) => {
  const meta = (question.meta ?? {}) as Record<string, unknown>;
  const [fillText, setFillText] = useState(typeof value === "string" ? value : "");

  useEffect(() => {
    if (question.type === "fill") {
      setFillText(typeof value === "string" ? value : "");
    }
  }, [question.id, question.type, value]);

  const sequenceItems = useMemo(() => {
    if (question.type !== "sequence") return [];
    return (question.options?.map((option) => option.text) ?? []) as string[];
  }, [question]);

  const rightItems = useMemo(() => {
    if (question.type !== "matching") return [];
    return (meta.right as string[]) ?? [];
  }, [meta.right, question.type]);

  const leftItems = useMemo(() => {
    if (question.type !== "matching") return [];
    return (meta.left as string[]) ?? question.options.map((option) => option.text);
  }, [meta.left, question.options, question.type]);

  const currentMatching = Array.isArray(value) ? value : [];
  const currentSequence = Array.isArray(value) ? value : [];

  if (question.type === "fill") {
    return (
      <div className="space-y-4">
        <GlassCard className="bg-slate-950/40">
          <div className="text-base leading-7 text-slate-100">{question.question}</div>
        </GlassCard>
        <input
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40 focus:bg-white/10"
          placeholder="Введите ответ"
          value={fillText}
          onChange={(event) => {
            setFillText(event.target.value);
            onChange(event.target.value);
          }}
          disabled={locked}
        />
      </div>
    );
  }

  if (question.type === "matching") {
    const updatePair = (left: string, right: string) => {
      const next = currentMatching.filter((pair) => pair.left !== left);
      if (right) {
        next.push({ left, right });
      }
      onChange(next);
    };

    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="space-y-3">
          <div className="text-sm font-medium text-slate-300">Термины</div>
          {leftItems.map((left) => {
            const selected = currentMatching.find((pair) => pair.left === left)?.right ?? "";
            return (
              <div key={left} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm text-white">{left}</div>
                <select
                  className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none"
                  value={selected}
                  onChange={(event) => updatePair(left, event.target.value)}
                  disabled={locked}
                >
                  <option value="">Выберите определение</option>
                  {rightItems.map((right) => (
                    <option key={right} value={right}>
                      {right}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </GlassCard>
        <GlassCard className="space-y-3">
          <div className="text-sm font-medium text-slate-300">Определения</div>
          {rightItems.map((right) => (
            <div key={right} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              {right}
            </div>
          ))}
        </GlassCard>
      </div>
    );
  }

  if (question.type === "sequence") {
    const selected = currentSequence as string[];
    const add = (item: string) => {
      if (locked) return;
      if (selected.includes(item)) return;
      onChange([...selected, item]);
    };
    const remove = (item: string) => {
      onChange(selected.filter((value) => value !== item));
    };
    const move = (index: number, dir: -1 | 1) => {
      const next = [...selected];
      const swapIndex = index + dir;
      if (swapIndex < 0 || swapIndex >= next.length) return;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      onChange(next);
    };

    return (
      <div className="space-y-4">
        <GlassCard>
          <div className="text-base leading-7 text-slate-100">{question.question}</div>
        </GlassCard>
        <div className="grid gap-3 md:grid-cols-2">
          <GlassCard className="space-y-3">
            <div className="text-sm font-medium text-slate-300">Элементы</div>
            <div className="flex flex-wrap gap-2">
              {sequenceItems
                .filter((item) => !selected.includes(item))
                .map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                    onClick={() => add(item)}
                    disabled={locked}
                  >
                    {item}
                  </button>
                ))}
            </div>
          </GlassCard>
          <GlassCard className="space-y-3">
            <div className="text-sm font-medium text-slate-300">Порядок</div>
            <div className="space-y-2">
              {selected.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                  Нажимайте на элементы слева, чтобы собрать последовательность
                </div>
              ) : (
                selected.map((item, index) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <GripVertical className="h-4 w-4 text-slate-500" />
                    <div className="flex-1 text-sm text-white">{item}</div>
                    <button type="button" onClick={() => move(index, -1)} disabled={locked || index === 0} className="rounded-full p-1 text-slate-300 hover:bg-white/5 disabled:opacity-40">
                      <Minus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={locked || index === selected.length - 1} className="rounded-full p-1 text-slate-300 hover:bg-white/5 disabled:opacity-40">
                      <Plus className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(item)} disabled={locked} className="rounded-full p-1 text-slate-300 hover:bg-white/5">
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (question.type === "trueFalse") {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {question.options.map((option) => {
          const selected = value === (option.id === "true");
          return (
            <button
              type="button"
              key={option.id}
              className={optionClasses(selected)}
              onClick={() => onChange(option.id === "true")}
              disabled={locked}
            >
              <div className="text-base font-medium">{option.text}</div>
            </button>
          );
        })}
      </div>
    );
  }

  const selectedIds = Array.isArray(value) ? value : [];

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {question.options.map((option) => {
        const selected = typeof value === "string" ? value === option.id : selectedIds.includes(option.id);
        const handleClick = () => {
          if (locked) return;
          if (question.type === "multiple") {
            if (selected) {
              onChange(selectedIds.filter((id) => id !== option.id));
              return;
            }
            onChange([...selectedIds, option.id]);
            return;
          }
          onChange(option.id);
        };

        return (
          <button
            key={option.id}
            type="button"
            className={optionClasses(selected)}
            onClick={handleClick}
            disabled={locked}
          >
            {option.image ? (
              <div className="mb-3 grid h-40 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-5">
                <img src={option.image} alt={option.text} className="h-full w-full object-contain" />
              </div>
            ) : null}
            <div className="text-base font-medium">{option.text}</div>
          </button>
        );
      })}
    </div>
  );
};

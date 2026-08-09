import type { Question } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button, GlassCard } from "./ui";
import { cn, shuffleArray } from "@/lib/utils";
import { ArrowDown, ArrowUp, GripVertical, X } from "lucide-react";

export type AnswerValue = string | string[] | boolean | { left: string; right: string }[];

type Props = {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  locked?: boolean;
  hiddenOptionIds?: string[];
  feedback?: "correct" | "wrong" | null;
};

const optionClasses = (selected: boolean, correct: boolean, feedback?: "correct" | "wrong" | null) =>
  cn(
    "w-full rounded-2xl border px-4 py-3 text-left transition",
    feedback === "correct" && correct
      ? "nashelingo-answer-correct"
      : feedback === "wrong" && selected && !correct
        ? "nashelingo-answer-wrong"
        : feedback === "wrong" && correct
          ? "nashelingo-answer-correct"
          : selected
      ? "border-cyan-300/40 bg-cyan-400/15 text-white shadow-glow"
      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10",
  );

export const QuestionRenderer = ({ question, value, onChange, locked, hiddenOptionIds = [], feedback = null }: Props) => {
  const meta = (question.meta ?? {}) as Record<string, unknown>;
  const [fillText, setFillText] = useState(typeof value === "string" ? value : "");
  const [draggedSequenceItem, setDraggedSequenceItem] = useState<string | null>(null);
  const [dragOverSequenceIndex, setDragOverSequenceIndex] = useState<number | null>(null);

  useEffect(() => {
    if (question.type === "fill") {
      setFillText(typeof value === "string" ? value : "");
    }
  }, [question.id, question.type, value]);

  useEffect(() => {
    setDraggedSequenceItem(null);
    setDragOverSequenceIndex(null);
  }, [question.id]);

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
      <div>
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
      if (locked) return;
      onChange(selected.filter((value) => value !== item));
    };
    const move = (index: number, dir: -1 | 1) => {
      const next = [...selected];
      const swapIndex = index + dir;
      if (swapIndex < 0 || swapIndex >= next.length) return;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      onChange(next);
    };
    const placeAt = (item: string, targetIndex: number) => {
      if (locked || !item || !sequenceItems.includes(item)) return;
      const sourceIndex = selected.indexOf(item);
      const next = selected.filter((value) => value !== item);
      const adjustedIndex = sourceIndex >= 0 && sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(Math.max(0, Math.min(adjustedIndex, next.length)), 0, item);
      onChange(next);
      setDraggedSequenceItem(null);
      setDragOverSequenceIndex(null);
    };
    const beginDrag = (item: string, dataTransfer: DataTransfer) => {
      if (locked) return;
      setDraggedSequenceItem(item);
      dataTransfer.effectAllowed = "move";
      dataTransfer.setData("text/plain", item);
    };
    const returnToAvailable = (event: React.DragEvent<HTMLDivElement>) => {
      if (locked) return;
      event.preventDefault();
      const item = draggedSequenceItem ?? event.dataTransfer.getData("text/plain");
      if (item && selected.includes(item)) {
        onChange(selected.filter((value) => value !== item));
      }
      setDraggedSequenceItem(null);
      setDragOverSequenceIndex(null);
    };
    const dropToAvailable = () => {
      if (locked || !draggedSequenceItem) return;
      if (selected.includes(draggedSequenceItem)) {
        onChange(selected.filter((value) => value !== draggedSequenceItem));
      }
      setDraggedSequenceItem(null);
      setDragOverSequenceIndex(null);
    };
    const beginPointerDrag = (item: string) => {
      if (locked) return;
      setDraggedSequenceItem(item);
    };
    const movePointerOver = (index: number) => {
      if (locked || !draggedSequenceItem) return;
      setDragOverSequenceIndex(index);
    };
    const dropPointerAt = (index: number) => {
      if (locked || !draggedSequenceItem) return;
      placeAt(draggedSequenceItem, index);
    };

    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <GlassCard
            className="space-y-3"
            onDragOver={(event) => { if (!locked) event.preventDefault(); }}
            onDrop={returnToAvailable}
            onPointerUp={(event) => { if (event.target === event.currentTarget) dropToAvailable(); }}
          >
            <div className="text-sm font-medium text-slate-300">Элементы</div>
            <div className="flex flex-wrap gap-2">
              {sequenceItems
                .filter((item) => !selected.includes(item))
                .map((item) => (
                  <motion.button
                    key={item}
                    type="button"
                    draggable={!locked}
                    onDragStart={(event) => beginDrag(item, event.dataTransfer)}
                    onDragEnd={() => { setDraggedSequenceItem(null); setDragOverSequenceIndex(null); }}
                    onPointerDown={() => beginPointerDrag(item)}
                    onPointerEnter={() => { if (draggedSequenceItem) movePointerOver(selected.length); }}
                    onPointerUp={() => { if (draggedSequenceItem && selected.includes(draggedSequenceItem)) dropToAvailable(); else add(item); }}
                    layout
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    animate={{ opacity: draggedSequenceItem === item ? 0.45 : 1 }}
                    className="touch-none select-none cursor-grab rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10 active:cursor-grabbing"
                    disabled={locked}
                    title="Перетащите в список или нажмите"
                  >
                    {item}
                  </motion.button>
                ))}
            </div>
          </GlassCard>
          <GlassCard className="space-y-3">
            <div className="text-sm font-medium text-slate-300">Порядок</div>
            <div
              className="min-h-24 space-y-2"
              onDragOver={(event) => { if (!locked) { event.preventDefault(); setDragOverSequenceIndex(selected.length); } }}
              onDrop={(event) => { event.preventDefault(); placeAt(draggedSequenceItem ?? event.dataTransfer.getData("text/plain"), selected.length); }}
              onPointerEnter={() => { if (draggedSequenceItem) movePointerOver(selected.length); }}
              onPointerUp={() => dropPointerAt(selected.length)}
            >
              {selected.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-slate-500">
                  Нажимайте на элементы слева, чтобы собрать последовательность
                </div>
              ) : (
                selected.map((item, index) => (
                  <motion.div
                    key={item}
                    layout
                    transition={{ layout: { type: "spring", stiffness: 520, damping: 38 } }}
                    onDragOver={(event) => { if (!locked) { event.preventDefault(); event.stopPropagation(); setDragOverSequenceIndex(index); } }}
                    onDrop={(event) => { event.preventDefault(); event.stopPropagation(); placeAt(draggedSequenceItem ?? event.dataTransfer.getData("text/plain"), index); }}
                    onPointerEnter={() => movePointerOver(index)}
                    onPointerUp={() => dropPointerAt(index)}
                    className={cn("touch-none select-none flex items-center gap-2 rounded-2xl border px-3 py-2 transition-colors", dragOverSequenceIndex === index ? "border-cyan-300/60 bg-cyan-400/15 shadow-[0_0_0_2px_rgba(103,232,249,0.14)]" : "border-white/10 bg-white/5", draggedSequenceItem === item ? "scale-[0.98] opacity-60" : "")}
                  >
                    <button
                      type="button"
                      draggable={!locked}
                      onDragStart={(event) => beginDrag(item, event.dataTransfer)}
                      onDragEnd={() => { setDraggedSequenceItem(null); setDragOverSequenceIndex(null); }}
                      onPointerDown={() => beginPointerDrag(item)}
                      className="cursor-grab rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white active:cursor-grabbing"
                      title="Перетащить выше или ниже"
                      aria-label={`Перетащить ${item}`}
                      disabled={locked}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex-1 text-sm text-white">{item}</div>
                    <button type="button" onClick={() => move(index, -1)} disabled={locked || index === 0} className="rounded-full p-1 text-slate-300 hover:bg-white/5 disabled:opacity-40" title="Поднять выше" aria-label="Поднять выше">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={locked || index === selected.length - 1} className="rounded-full p-1 text-slate-300 hover:bg-white/5 disabled:opacity-40" title="Опустить ниже" aria-label="Опустить ниже">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => remove(item)} disabled={locked} className="rounded-full p-1 text-slate-300 hover:bg-white/5" title="Убрать из списка" aria-label="Убрать из списка">
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
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
          const correct = question.correct === (option.id === "true");
          return (
            <button
              type="button"
              key={option.id}
              className={optionClasses(selected, correct, feedback)}
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
      {question.options.filter((option) => !hiddenOptionIds.includes(option.id)).map((option) => {
        const selected = typeof value === "string" ? value === option.id : selectedIds.includes(option.id);
        const correct = Array.isArray(question.correct)
          ? question.correct.map(String).includes(option.id)
          : String(question.correct) === option.id;
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
            className={optionClasses(selected, correct, feedback)}
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

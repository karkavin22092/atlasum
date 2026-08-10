import { Check } from "lucide-react";
import type { SubjectId } from "@shared/types";

type Topic = { key: string; title: string; examOnly?: boolean };

const subjectTone: Record<SubjectId, { active: string; dot: string }> = {
  "it-design": { active: "border-cyan-300/50 bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_3px_rgba(34,211,238,0.08)]", dot: "bg-cyan-300" },
  management: { active: "border-rose-300/50 bg-rose-400/15 text-rose-100 shadow-[0_0_0_3px_rgba(251,113,133,0.08)]", dot: "bg-rose-300" },
  economics: { active: "border-emerald-300/50 bg-emerald-400/15 text-emerald-100 shadow-[0_0_0_3px_rgba(52,211,153,0.08)]", dot: "bg-emerald-300" },
  english: { active: "border-fuchsia-300/50 bg-fuchsia-400/15 text-fuchsia-100 shadow-[0_0_0_3px_rgba(232,121,249,0.08)]", dot: "bg-fuchsia-300" },
};

export const TopicPicker = ({
  topics,
  selected,
  subject,
  onToggle,
  disabled = false,
  allowExamOnly = false,
}: {
  topics: Topic[];
  selected: string[];
  subject: SubjectId;
  onToggle: (topic: string) => void;
  disabled?: boolean;
  allowExamOnly?: boolean;
}) => {
  const tone = subjectTone[subject];
  return (
    <div className="v27-topic-picker flex flex-wrap gap-2">
      {topics.map((topic) => {
        const active = selected.includes(topic.title);
        const topicDisabled = topic.examOnly ? !allowExamOnly : disabled;
        return (
          <button
            key={topic.key}
            type="button"
            aria-pressed={active}
            disabled={topicDisabled}
            onClick={() => onToggle(topic.title)}
            className={active
              ? `inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition duration-200 ${topicDisabled ? "cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500 shadow-none" : tone.active}`
              : `inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition duration-200 ${topicDisabled ? "cursor-not-allowed border-white/5 bg-white/[0.03] text-slate-500" : "border-white/10 bg-white/5 text-slate-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"}`}
          >
            {active ? <Check className="h-3.5 w-3.5" /> : <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} opacity-60`} />}
            {topic.title}
            {topic.examOnly ? <span className="text-[10px] uppercase tracking-wide opacity-70">только экзамен</span> : null}
          </button>
        );
      })}
    </div>
  );
};

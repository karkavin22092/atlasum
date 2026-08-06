import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BackButton, Badge, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import type { AppPageProps } from "./types";
import type { Question } from "@shared/types";
import { Download, FileUp, Plus, Save, Search, Trash2 } from "lucide-react";

const emptyQuestion = (): Question => ({
  id: `q-custom-${Date.now()}`,
  topic: "РРЅС„РѕСЂРјР°С†РёСЏ",
  difficulty: "easy",
  type: "single",
  question: "",
  options: [
    { id: "opt-1", text: "Р’Р°СЂРёР°РЅС‚ 1" },
    { id: "opt-2", text: "Р’Р°СЂРёР°РЅС‚ 2" },
    { id: "opt-3", text: "Р’Р°СЂРёР°РЅС‚ 3" },
    { id: "opt-4", text: "Р’Р°СЂРёР°РЅС‚ 4" },
  ],
  correct: "opt-1",
  explanation: "",
  source: "РџРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРёР№ РІРѕРїСЂРѕСЃ",
  tags: ["custom"],
});

export const AdminPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState<Question>(emptyQuestion());
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [jsonMessage, setJsonMessage] = useState<string | null>(null);

  const questionsQuery = useQuery({
    queryKey: ["questions", search, topic],
    queryFn: () => api.questions({ search, topic: topic || undefined }),
  });

  const questions = questionsQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        return api.createQuestion(draft);
      }
      return api.updateQuestion(draft.id, draft);
    },
    onSuccess: async () => {
      setJsonMessage(mode === "create" ? "Р’РѕРїСЂРѕСЃ СЃРѕР·РґР°РЅ" : "Р’РѕРїСЂРѕСЃ РѕР±РЅРѕРІР»С‘РЅ");
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
      setDraft(emptyQuestion());
      setMode("create");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteQuestion(id),
    onSuccess: async () => {
      setJsonMessage("Р’РѕРїСЂРѕСЃ СѓРґР°Р»С‘РЅ");
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (questions: Question[]) => api.importQuestions(questions),
    onSuccess: async (value) => {
      setJsonMessage(`РРјРїРѕСЂС‚РёСЂРѕРІР°РЅРѕ: ${value.imported}`);
      await queryClient.invalidateQueries({ queryKey: ["questions"] });
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
      await queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });

  const topicOptions = useMemo(() => {
    return Array.from(new Set(questions.map((question) => question.topic))).sort();
  }, [questions]);

  const loadQuestion = (question: Question) => {
    setDraft(question);
    setMode("edit");
  };

  const setField = <K extends keyof Question>(key: K, value: Question[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const parseJsonArray = (text: string, fallback: unknown) => {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  };

  const optionsText = JSON.stringify(draft.options, null, 2);
  const correctText = JSON.stringify(draft.correct, null, 2);
  const metaText = JSON.stringify(draft.meta ?? {}, null, 2);

  return (
    <div className="space-y-6">
      <TitleBlock
        eyebrow="РђРґРјРёРЅ-РїР°РЅРµР»СЊ"
        title="РЈРїСЂР°РІР»РµРЅРёРµ РІРѕРїСЂРѕСЃР°РјРё"
        description="Р”РѕР±Р°РІР»СЏР№С‚Рµ, СЂРµРґР°РєС‚РёСЂСѓР№С‚Рµ, СѓРґР°Р»СЏР№С‚Рµ Рё РёРјРїРѕСЂС‚РёСЂСѓР№С‚Рµ JSON Р±РµР· РІС‹С…РѕРґР° РёР· РїСЂРёР»РѕР¶РµРЅРёСЏ."
      />
      <div className="mb-2">
        <BackButton to="/" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <Panel className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => {
              setDraft(emptyQuestion());
              setMode("create");
            }}>
              <Plus className="h-4 w-4" />
              РќРѕРІС‹Р№ РІРѕРїСЂРѕСЃ
            </Button>
            <Button variant="secondary" onClick={async () => {
              const data = await api.exportQuestions();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "questions-export.json";
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="h-4 w-4" />
              Р­РєСЃРїРѕСЂС‚ JSON
            </Button>
            <Button variant="secondary" onClick={() => {
              const imported = window.prompt("Р’СЃС‚Р°РІСЊС‚Рµ JSON-РјР°СЃСЃРёРІ РІРѕРїСЂРѕСЃРѕРІ:");
              if (!imported) return;
              try {
                const parsed = JSON.parse(imported) as Question[];
                importMutation.mutate(parsed);
              } catch {
                setJsonMessage("РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ JSON");
              }
            }}>
              <FileUp className="h-4 w-4" />
              РРјРїРѕСЂС‚ JSON
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              <div>РџРѕРёСЃРє</div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3">
                <Search className="h-4 w-4 text-slate-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-3 text-white outline-none" placeholder="РўРµРєСЃС‚, С‚РµРіРё..." />
              </div>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>РўРµРјР°</div>
              <select value={topic} onChange={(event) => setTopic(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
                <option value="">Р’СЃРµ С‚РµРјС‹</option>
                {topicOptions.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="max-h-[70vh] space-y-3 overflow-auto pr-1 scrollbar-thin">
            {questions.map((question) => (
              <GlassCard key={question.id} className="cursor-pointer transition hover:border-cyan-300/20" onClick={() => loadQuestion(question)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="cyan">{question.topic}</Badge>
                      <Badge tone={question.difficulty === "hard" ? "rose" : question.difficulty === "medium" ? "amber" : "emerald"}>{question.difficulty}</Badge>
                      <Badge tone="violet">{question.type}</Badge>
                    </div>
                    <div className="text-sm font-medium text-white">{question.question}</div>
                    <div className="text-xs text-slate-500">{question.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={(event) => {
                      event.stopPropagation();
                      loadQuestion(question);
                    }}>
                      Edit
                    </Button>
                    <Button variant="danger" onClick={(event) => {
                      event.stopPropagation();
                      deleteMutation.mutate(question.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{mode === "create" ? "РЎРѕР·РґР°РЅРёРµ" : "Р РµРґР°РєС‚РёСЂРѕРІР°РЅРёРµ"}</div>
              <div className="text-xl font-semibold text-white">{draft.id}</div>
            </div>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4" />
              РЎРѕС…СЂР°РЅРёС‚СЊ
            </Button>
          </div>

          {jsonMessage ? <GlassCard className="text-sm text-slate-200">{jsonMessage}</GlassCard> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              <div>ID</div>
              <input value={draft.id} onChange={(event) => setField("id", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>РСЃС‚РѕС‡РЅРёРє</div>
              <input value={draft.source} onChange={(event) => setField("source", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>РўРµРјР°</div>
              <input value={draft.topic} onChange={(event) => setField("topic", event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>РЎР»РѕР¶РЅРѕСЃС‚СЊ</div>
              <select value={draft.difficulty} onChange={(event) => setField("difficulty", event.target.value as Question["difficulty"])} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none">
                <option value="easy">easy</option>
                <option value="medium">medium</option>
                <option value="hard">hard</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>РўРёРї</div>
              <input value={draft.type} onChange={(event) => setField("type", event.target.value as Question["type"])} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>РўРµРіРё</div>
              <input value={draft.tags.join(", ")} onChange={(event) => setField("tags", event.target.value.split(",").map((item) => item.trim()).filter(Boolean))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
            </label>
          </div>

          <label className="space-y-1 text-sm text-slate-300">
            <div>Р’РѕРїСЂРѕСЃ</div>
            <textarea value={draft.question} onChange={(event) => setField("question", event.target.value)} className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
          </label>
          <label className="space-y-1 text-sm text-slate-300">
            <div>РћР±СЉСЏСЃРЅРµРЅРёРµ</div>
            <textarea value={draft.explanation} onChange={(event) => setField("explanation", event.target.value)} className="min-h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" />
          </label>

          <div className="grid gap-3">
            <label className="space-y-1 text-sm text-slate-300">
              <div>Options JSON</div>
              <textarea
                value={optionsText}
                onChange={(event) => setField("options", parseJsonArray(event.target.value, draft.options))}
                className="min-h-36 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>Correct JSON</div>
              <textarea
                value={correctText}
                onChange={(event) => setField("correct", parseJsonArray(event.target.value, draft.correct))}
                className="min-h-36 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-white outline-none"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              <div>Meta JSON</div>
              <textarea
                value={metaText}
                onChange={(event) => setField("meta", parseJsonArray(event.target.value, draft.meta))}
                className="min-h-36 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-white outline-none"
              />
            </label>
          </div>
        </Panel>
      </div>
    </div>
  );
};

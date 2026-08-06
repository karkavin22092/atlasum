import type { SubmissionResponse } from "@shared/types";
import { BackButton, Badge, Button, GlassCard, Panel, ProgressBar, TitleBlock } from "./ui";
import { formatDuration } from "@/lib/utils";
import { CheckCircle2, CircleX, Clock3, RotateCcw, Sparkles } from "lucide-react";

type Props = {
  result: SubmissionResponse;
  onRetry: () => void;
  onReviewMistakes: () => void;
  onNewTest: () => void;
};

export const ResultPanel = ({ result, onRetry, onReviewMistakes, onNewTest }: Props) => {
  const correct = result.results.filter((item) => item.isCorrect);
  const wrong = result.results.filter((item) => !item.isCorrect);

  return (
    <div className="space-y-6">
      <Panel>
        <TitleBlock
          eyebrow="Р РµР·СѓР»СЊС‚Р°С‚"
          title="РўРµСЃС‚ Р·Р°РІРµСЂС€С‘РЅ"
          description="Р—РґРµСЃСЊ РІРёРґРЅРѕ РЅРµ С‚РѕР»СЊРєРѕ СЃС‡С‘С‚, РЅРѕ Рё РіРґРµ РёРјРµРЅРЅРѕ РµСЃС‚СЊ РїСЂРѕР±РµР»С‹ РґР»СЏ СЃР»РµРґСѓСЋС‰РµРіРѕ РїРѕРІС‚РѕСЂРµРЅРёСЏ."
          right={<Badge tone="violet">{result.grade} РѕС†РµРЅРєР°</Badge>}
        />

        <div className="grid gap-4 md:grid-cols-4">
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Р‘Р°Р»Р»С‹</div>
            <div className="mt-2 text-3xl font-semibold text-white">
              {result.score}/{result.maxScore}
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">РџСЂРѕС†РµРЅС‚</div>
            <div className="mt-2 text-3xl font-semibold text-white">{result.percent}%</div>
            <div className="mt-3">
              <ProgressBar value={result.percent} />
            </div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Р’СЂРµРјСЏ</div>
            <div className="mt-2 text-3xl font-semibold text-white">{formatDuration(result.durationMs)}</div>
          </GlassCard>
          <GlassCard>
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">XP</div>
            <div className="mt-2 text-3xl font-semibold text-white">+{result.xpGained}</div>
            <div className="mt-2 text-sm text-slate-400">РњРѕРЅРµС‚С‹ +{result.coinsGained}</div>
          </GlassCard>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            РџСЂРѕР№С‚Рё СЃРЅРѕРІР°
          </Button>
          <BackButton to="/" />
          <Button variant="secondary" onClick={onReviewMistakes}>
            <CircleX className="h-4 w-4" />
            Р Р°Р·РѕР±СЂР°С‚СЊ РѕС€РёР±РєРё
          </Button>
          <Button variant="secondary" onClick={onNewTest}>
            <Sparkles className="h-4 w-4" />
            РЎРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ РЅРѕРІС‹Р№ С‚РµСЃС‚
          </Button>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            РџСЂР°РІРёР»СЊРЅС‹Рµ РѕС‚РІРµС‚С‹
          </div>
          <div className="space-y-3">
            {correct.map((item) => (
              <GlassCard key={item.questionId} className="border-emerald-400/20">
                <div className="text-sm font-medium text-white">{item.question}</div>
                <div className="mt-1 text-sm text-emerald-200/90">{JSON.stringify(item.correctAnswer)}</div>
                <div className="mt-2 text-sm text-slate-400">{item.explanation}</div>
              </GlassCard>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Clock3 className="h-5 w-5 text-cyan-400" />
            РћС€РёР±РєРё
          </div>
          <div className="space-y-3">
            {wrong.length === 0 ? (
              <GlassCard className="text-sm text-slate-300">Р‘РµР· РѕС€РёР±РѕРє. РћС‚Р»РёС‡РЅР°СЏ СЂР°Р±РѕС‚Р°.</GlassCard>
            ) : (
              wrong.map((item) => (
                <GlassCard key={item.questionId} className="border-rose-400/20">
                  <div className="text-sm font-medium text-white">{item.question}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    Р’Р°С€ РѕС‚РІРµС‚: <span className="text-rose-200">{JSON.stringify(item.userAnswer)}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    РџСЂР°РІРёР»СЊРЅС‹Р№: <span className="text-emerald-200">{JSON.stringify(item.correctAnswer)}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{item.whyWrong}</div>
                </GlassCard>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};

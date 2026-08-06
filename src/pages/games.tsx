import { Link } from "react-router-dom";
import { BackButton, Button, GlassCard, Panel, TitleBlock } from "@/components/ui";
import type { AppPageProps } from "./types";
import { Gamepad2, Play } from "lucide-react";

export const GamesPage = ({ meta }: AppPageProps) => {
  return (
    <div className="space-y-6">
      <TitleBlock
        eyebrow="РњРёРЅРё-РёРіСЂС‹"
        title="Р‘С‹СЃС‚СЂРѕРµ Р·Р°РєСЂРµРїР»РµРЅРёРµ Р±РµР· СЃРєСѓРєРё"
        description="РљР°Р¶РґР°СЏ РёРіСЂР° РёСЃРїРѕР»СЊР·СѓРµС‚ С‚Сѓ Р¶Рµ Р»РѕРєР°Р»СЊРЅСѓСЋ Р±Р°Р·Сѓ РІРѕРїСЂРѕСЃРѕРІ, РЅРѕ РїРѕРґР°РµС‚ РµС‘ РІ РґСЂСѓРіРѕРј С‚РµРјРїРµ Рё СЃ РґСЂСѓРіРѕР№ РјРµС…Р°РЅРёРєРѕР№."
      />
      <div className="mb-2">
        <BackButton to="/" />
      </div>

      <Panel>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {meta?.games.map((game) => (
            <Link key={game.key} to={`/games/${game.key}`}>
              <GlassCard className="group h-full transition duration-200 hover:-translate-y-1 hover:border-cyan-300/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">{game.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-400">{game.description}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-300 transition group-hover:scale-105">
                    <Gamepad2 className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                  <Play className="h-4 w-4" />
                  РРіСЂР°С‚СЊ СЃРµР№С‡Р°СЃ
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
};

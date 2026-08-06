import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { AlertTriangle, LogOut, ShieldCheck } from "lucide-react";
import { Button, Panel } from "./ui";

export const ATTEMPT_EXIT_MESSAGE = "Если выйти сейчас, попытка не сохранится: баллы, XP и монеты не будут начислены. Выйти без сохранения?";

export const confirmDiscardAttempt = (active: boolean) => !active || window.confirm(ATTEMPT_EXIT_MESSAGE);

export const AttemptExitNotice = () => (
  <div className="flex items-start gap-3 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
    <div>
      <div className="font-semibold">Завершите попытку, чтобы получить баллы</div>
      <div className="mt-1 text-amber-100/75">При досрочном выходе результат не сохраняется, XP и монеты не начисляются.</div>
    </div>
  </div>
);

export const AttemptExitGuard = ({ active }: { active: boolean }) => {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    active && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!active) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [active]);

  if (blocker.state !== "blocked") return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="attempt-exit-title" className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/75 p-4 backdrop-blur-md">
      <Panel className="w-full max-w-lg border border-amber-300/25 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div id="attempt-exit-title" className="text-xl font-semibold text-white">Выйти досрочно?</div>
            <div className="mt-2 text-sm leading-6 text-slate-300">
              Попытка не будет сохранена. Баллы, XP и монеты за неё не начислятся.
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => blocker.reset()}>
            <ShieldCheck className="h-4 w-4" />
            Продолжить попытку
          </Button>
          <Button variant="danger" onClick={() => blocker.proceed()}>
            <LogOut className="h-4 w-4" />
            Выйти без баллов
          </Button>
        </div>
      </Panel>
    </div>
  );
};

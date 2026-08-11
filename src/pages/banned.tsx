import { ShieldBan } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export const BannedPage = () => {
  const { user, logout } = useAuth();
  return (
    <main className="theme-shell grid min-h-screen place-items-center px-4 text-slate-100">
      <section className="w-full max-w-md text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-300"><ShieldBan className="h-7 w-7" /></div>
        <h1 className="mt-5 text-2xl font-semibold text-white">Аккаунт заблокирован</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">Доступ к Атласуму для этого аккаунта ограничен навсегда.</p>
        {user?.banReason ? <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">Причина: {user.banReason}</p> : null}
        <Button variant="secondary" className="mt-6" onClick={logout}>Выйти</Button>
      </section>
    </main>
  );
};

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, LoaderCircle, LogOut, Palette, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { imageFileToDataUrl } from "@/lib/images";
import { DEFAULT_INTERFACE_COLOR, INTERFACE_COLORS, type InterfaceColor } from "@/lib/interface-colors";

const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();

export const AvatarMenu = ({ compact = false }: { compact?: boolean }) => {
  const { user, updateAvatar, updateInterfaceColor, logout } = useAuth();
  const queryClient = useQueryClient();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      const menu = detailsRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && detailsRef.current?.open) {
        detailsRef.current.removeAttribute("open");
        detailsRef.current.querySelector("summary")?.focus();
      }
    };

    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  if (!user) return null;

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setPending(true);
    try {
      const avatarUrl = await imageFileToDataUrl(file, { maxSide: 512, quality: 0.8, maxLength: 350_000 });
      await updateAvatar(avatarUrl);
      await queryClient.invalidateQueries({ queryKey: ["site-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
      detailsRef.current?.removeAttribute("open");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить аватар");
    } finally {
      setPending(false);
    }
  };

  const removeAvatar = async () => {
    setError("");
    setPending(true);
    try {
      await updateAvatar(null);
      await queryClient.invalidateQueries({ queryKey: ["site-reviews"] });
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
      detailsRef.current?.removeAttribute("open");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось удалить аватар");
    } finally {
      setPending(false);
    }
  };

  const chooseInterfaceColor = async (interfaceColor: InterfaceColor) => {
    if (pending || user?.interfaceColor === interfaceColor) return;
    setError("");
    setPending(true);
    try {
      await updateInterfaceColor(interfaceColor);
      await queryClient.invalidateQueries({ queryKey: ["meta"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить цвет");
    } finally {
      setPending(false);
    }
  };

  return (
    <details ref={detailsRef} className="avatar-menu relative">
      <summary
        aria-label="Открыть меню профиля"
        title="Профиль и аватар"
        className={`avatar-trigger relative grid cursor-pointer list-none place-items-center overflow-hidden rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-white transition hover:border-cyan-300/30 hover:bg-white/15 [&::-webkit-details-marker]:hidden ${compact ? "h-10 w-10" : "h-9 w-9"}`}
      >
        {pending ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-cyan-300" />
        ) : user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            <span>{initials(user.name)}</span>
            <span className="avatar-add-badge" aria-hidden="true"><ImagePlus /></span>
          </>
        )}
      </summary>

      <div className="avatar-popover glass-strong absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl p-2 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-3 pt-1">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-xs font-semibold text-white">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user.name}</div>
            <div className="truncate text-xs text-slate-400">{user.email}</div>
          </div>
        </div>

        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="avatar-upload-action mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50">
          <ImagePlus className="h-4 w-4 text-cyan-300" />Загрузить аватар
        </button>
        {user.avatarUrl ? (
          <button type="button" onClick={() => void removeAvatar()} disabled={pending} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10 disabled:opacity-50">
            <Trash2 className="h-4 w-4 text-rose-300" />Удалить аватар
          </button>
        ) : null}
        <div className="mt-2 border-t border-white/10 px-2 pb-2 pt-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
            <Palette className="h-3.5 w-3.5 text-cyan-300" />
            Цвет интерфейса
          </div>
          <div className="grid grid-cols-6 gap-2">
            {INTERFACE_COLORS.map((color) => {
              const active = (user.interfaceColor ?? DEFAULT_INTERFACE_COLOR) === color.key;
              return (
                <button
                  key={color.key}
                  type="button"
                  className={`interface-color-swatch interface-color-swatch-${color.key}${active ? " is-active" : ""}`}
                  onClick={() => void chooseInterfaceColor(color.key)}
                  disabled={pending}
                  aria-label={`Выбрать ${color.label} цвет интерфейса`}
                  aria-pressed={active}
                  title={color.label}
                >
                  {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/10">
          <LogOut className="h-4 w-4 text-slate-400" />Выйти
        </button>
        {error ? <div role="alert" className="mt-2 rounded-xl bg-rose-400/10 px-3 py-2 text-xs leading-5 text-rose-200">{error}</div> : null}
      </div>

      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => void chooseAvatar(event)} />
    </details>
  );
};

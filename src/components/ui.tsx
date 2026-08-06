import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const GlassCard = ({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("glass rounded-3xl p-4 sm:p-5", className)} {...props}>
    {children}
  </div>
);

export const Panel = ({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("glass-strong rounded-3xl p-4 sm:p-6", className)} {...props}>
    {children}
  </div>
);

export const TitleBlock = ({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) => (
  <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? <div className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">{eyebrow}</div> : null}
      <h1 className="text-2xl font-semibold text-white sm:text-4xl">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">{description}</p> : null}
    </div>
    {right}
  </div>
);

export const StatCard = ({
  label,
  value,
  hint,
  accent = "from-cyan-400 to-sky-500",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: string;
}) => (
  <GlassCard className="relative overflow-hidden">
    <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accent)} />
    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</div>
    <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    {hint ? <div className="mt-2 text-sm text-slate-400">{hint}</div> : null}
  </GlassCard>
);

export const Button = ({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) => {
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 text-slate-950 shadow-glow hover:brightness-110",
    secondary: "bg-white/10 text-white hover:bg-white/15 border border-white/10",
    ghost: "text-slate-200 hover:bg-white/5 border border-transparent",
    danger: "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-400/20",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge = ({
  children,
  className,
  tone = "cyan",
}: {
  children: ReactNode;
  className?: string;
  tone?: "cyan" | "violet" | "emerald" | "amber" | "rose" | "slate";
}) => {
  const tones: Record<string, string> = {
    cyan: "bg-cyan-400/15 text-cyan-100 border-cyan-300/20",
    violet: "bg-violet-400/15 text-violet-100 border-violet-300/20",
    emerald: "bg-emerald-400/15 text-emerald-100 border-emerald-300/20",
    amber: "bg-amber-400/15 text-amber-100 border-amber-300/20",
    rose: "bg-rose-400/15 text-rose-100 border-rose-300/20",
    slate: "bg-slate-400/15 text-slate-100 border-slate-300/20",
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
};

export const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 overflow-hidden rounded-full bg-white/10">
    <motion.div
      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500"
      initial={{ width: 0 }}
      animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  </div>
);

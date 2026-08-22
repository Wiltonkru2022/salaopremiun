import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { PainelTableSkeleton } from "./PainelSkeleton";

export {
  PainelAgendaSkeleton,
  PainelDashboardSkeleton,
  PainelTableSkeleton,
} from "./PainelSkeleton";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  default: "border-zinc-200 bg-zinc-50 text-zinc-700",
  accent: "border-amber-200 bg-amber-50 text-amber-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

export function PainelSurface({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={clsx("rounded-lg border border-zinc-200 bg-white shadow-sm", className)}
    >
      {children}
    </section>
  );
}

type PainelButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<PainelButtonVariant, string> = {
  primary: "border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800",
  secondary: "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-300 hover:bg-zinc-50",
  ghost: "border-transparent bg-transparent text-zinc-700 hover:bg-zinc-100",
  danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
};

export function PainelButton({
  children,
  className,
  variant = "primary",
  loading = false,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PainelButtonVariant;
  loading?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black leading-none shadow-sm transition disabled:opacity-60",
        buttonVariants[variant],
        className
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function PainelLinkButton({
  children,
  className,
  variant = "primary",
  ...props
}: LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    variant?: PainelButtonVariant;
  }) {
  return (
    <Link
      {...props}
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-black leading-none shadow-sm transition",
        buttonVariants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function PainelInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-4 focus:ring-zinc-100",
        className
      )}
    />
  );
}

export function PainelPageHeader({
  title,
  description,
  message,
  eyebrow = "Painel",
  actions,
  className,
}: {
  title: string;
  description?: string;
  message?: string;
  fullHeight?: boolean;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const supportingText = description || message;

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
          {eyebrow}
        </p>
        <h1 className="mt-1 truncate text-xl font-black leading-tight tracking-normal text-zinc-950">
          {title}
        </h1>
        {supportingText ? (
          <p className="mt-1 max-w-3xl text-sm leading-5 text-zinc-500">
            {supportingText}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PainelToolbar({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={clsx(
        "flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PainelStatusBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-7 items-center rounded-full border px-2.5 text-[11px] font-black uppercase tracking-[0.12em]",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function PainelEmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center",
        className
      )}
    >
      <h2 className="text-base font-black text-zinc-950">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-md text-sm leading-5 text-zinc-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PainelInlineBusy({
  label = "Atualizando",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-800",
        className
      )}
      aria-live="polite"
    >
      <Loader2 size={13} className="animate-spin" />
      {label}
    </span>
  );
}

export function PainelListLoading({
  title,
  description,
  message,
}: {
  title: string;
  description?: string;
  message?: string;
  fullHeight?: boolean;
}) {
  return (
    <div className="space-y-3">
      <PainelPageHeader title={title} description={description || message} />
      <PainelTableSkeleton />
    </div>
  );
}

import { Loader2, Search, X } from "lucide-react";
import type { ReactNode } from "react";

export function Button({
  children,
  className = "",
  variant = "primary",
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
}) {
  const variants = {
    primary: "bg-zinc-950 text-white hover:bg-zinc-800",
    secondary: "border border-zinc-200 bg-white text-zinc-950 hover:bg-zinc-50",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100"
  };

  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.45rem] border border-zinc-200 bg-white p-4 shadow-soft ${className}`}>
      {children}
    </section>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-2xl border border-zinc-200 bg-white px-3 text-sm font-bold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 ${props.className || ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 ${props.className || ""}`}
    />
  );
}

export function Modal({
  open,
  title,
  subtitle,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-3 backdrop-blur-sm md:items-center">
      <section className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[1.65rem] border border-white/70 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-amber-700">Salão Premiun</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">{title}</h2>
              {subtitle ? <p className="mt-1 text-sm font-bold leading-5 text-zinc-500">{subtitle}</p> : null}
            </div>
            <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-950" onClick={onClose} aria-label="Fechar">
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="max-h-[calc(92vh-6rem)] overflow-auto px-5 py-5 thin-scrollbar">{children}</div>
      </section>
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center">
      <div className="text-base font-black text-zinc-950">{title}</div>
      <p className="mt-1 text-sm font-bold text-zinc-500">{message}</p>
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Buscar"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
      <Input className="pl-10" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const color = normalized.includes("confirm") || normalized.includes("fech")
    ? "bg-emerald-100 text-emerald-800"
    : normalized.includes("pend") || normalized.includes("aguard")
      ? "bg-amber-100 text-amber-800"
      : normalized.includes("cancel") || normalized.includes("excl")
        ? "bg-red-100 text-red-700"
        : "bg-zinc-100 text-zinc-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${color}`}>{status.replaceAll("_", " ")}</span>;
}

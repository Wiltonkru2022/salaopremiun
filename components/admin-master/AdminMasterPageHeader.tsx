import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, Clock3 } from "lucide-react";

export default function AdminMasterPageHeader({
  title,
  description,
  eyebrow = "Admin Master",
  actions,
  breadcrumb,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
  breadcrumb?: Array<{ label: string; href?: string }>;
}) {
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(new Date());
  const crumbs = breadcrumb?.length
    ? breadcrumb
    : [{ label: "Admin Master", href: "/admin-master" }, { label: title }];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5 px-1 text-xs font-semibold text-zinc-400">
        {crumbs.map((item, index) => (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            {index ? <ChevronRight size={13} /> : null}
            {item.href ? (
              <Link href={item.href} className="transition hover:text-violet-700">
                {item.label}
              </Link>
            ) : (
              <span className="text-zinc-700">{item.label}</span>
            )}
          </span>
        ))}
      </div>

      <section className="rounded--xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">
              {eyebrow}
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Clock3 size={13} /> Atualizado {updatedAt}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </section>
    </div>
  );
}

export function AdminMasterMetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "green" | "amber" | "red" | "blue" | "violet";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-950"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : tone === "red"
          ? "border-rose-200 bg-rose-50 text-rose-950"
          : tone === "blue"
            ? "border-blue-200 bg-blue-50 text-blue-950"
            : tone === "violet"
              ? "border-violet-200 bg-violet-50 text-violet-950"
              : "border-zinc-200 bg-white text-zinc-950";

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-sm leading-5 opacity-70">{hint}</div> : null}
    </div>
  );
}

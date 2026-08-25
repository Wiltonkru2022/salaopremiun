import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { AdminMasterSmartAction } from "@/lib/admin-master/smart-actions";

export default function AdminMasterSmartActionsPanel({ actions }: { actions: AdminMasterSmartAction[] }) {
  if (!actions.length) return null;
  const [primary, ...secondary] = actions;

  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-violet-700"><Sparkles size={15} /> Ação inteligente</span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${primary.tone}`}>{primary.priority}</span>
          </div>
          <h2 className="mt-3 text-xl font-black tracking-tight text-zinc-950 sm:text-2xl">{primary.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{primary.detail}</p>
          <Link href={primary.href} className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-700 px-4 text-sm font-black text-white transition hover:bg-violet-800">
            {primary.cta}<ArrowRight size={15} />
          </Link>
        </div>

        {secondary.length ? (
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:w-[430px] xl:grid-cols-1">
            {secondary.slice(0, 4).map((action) => (
              <Link key={`${action.title}-${action.href}`} href={action.href} className="group rounded-2xl border border-zinc-200 bg-white p-3.5 transition hover:border-violet-200 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{action.priority}</div>
                    <div className="mt-1 truncate text-sm font-black text-zinc-900">{action.title}</div>
                    <div className="mt-1 line-clamp-1 text-xs text-zinc-500">{action.detail}</div>
                  </div>
                  <ArrowRight size={15} className="mt-1 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

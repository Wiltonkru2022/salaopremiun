import Link from "next/link";
import { Clock3, ChevronRight, SlidersHorizontal } from "lucide-react";
import AdminMasterDataTableClient from "@/components/admin-master/AdminMasterDataTableClient";
import AdminMasterModuleActionButton from "@/components/admin-master/AdminMasterModuleActionButton";
import type { AdminKpi, AdminSectionData } from "@/lib/admin-master/data";

function toneClass(tone?: AdminKpi["tone"]) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-950";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-950";
  if (tone === "red") return "border-rose-200 bg-rose-50 text-rose-950";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-950";
  return "border-zinc-200 bg-white text-zinc-950";
}

function diagnosticTone(tone?: AdminKpi["tone"]) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50";
  if (tone === "amber") return "border-amber-200 bg-amber-50";
  if (tone === "red") return "border-rose-200 bg-rose-50";
  if (tone === "blue") return "border-blue-200 bg-blue-50";
  return "border-zinc-200 bg-zinc-50";
}

export default function AdminMasterSectionSimple({ data }: { data: AdminSectionData }) {
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Campo_Grande",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-zinc-400">
        <Link href="/admin-master" className="transition hover:text-violet-700">Admin Master</Link>
        <ChevronRight size={13} />
        <span className="text-zinc-700">{data.title}</span>
      </div>

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Admin Master</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{data.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{data.description}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400">
              <Clock3 size={13} /> Atualizado {updatedAt}
            </div>
          </div>

          {data.actions.length ? (
            <div className="flex flex-wrap gap-2">
              {data.actions.slice(0, 3).map((action) => (
                <AdminMasterModuleActionButton key={action} action={action} variant="pill" />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {data.kpis.length ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.kpis.slice(0, 8).map((kpi) => (
            <div key={kpi.label} className={`rounded-2xl border p-4 shadow-sm ${toneClass(kpi.tone)}`}>
              <div className="text-[11px] font-bold uppercase tracking-[0.16em] opacity-60">{kpi.label}</div>
              <div className="mt-2 text-2xl font-black tracking-tight">{kpi.value}</div>
              <div className="mt-1 text-sm leading-5 opacity-70">{kpi.hint}</div>
            </div>
          ))}
        </section>
      ) : null}

      {data.diagnostics?.length ? (
        <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3.5 text-sm font-bold text-zinc-700">
            <span className="inline-flex items-center gap-2"><SlidersHorizontal size={16} className="text-zinc-400" /> Diagnóstico e contexto</span>
            <span className="text-xs font-semibold text-zinc-400 group-open:hidden">Mostrar</span>
            <span className="hidden text-xs font-semibold text-zinc-400 group-open:inline">Ocultar</span>
          </summary>
          <div className="grid gap-3 border-t border-zinc-100 p-4 lg:grid-cols-3">
            {data.diagnostics.map((item) => {
              const card = (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-xl font-black text-zinc-950">{item.value}</div>
                  <p className="mt-1.5 text-sm leading-5 text-zinc-600">{item.detail}</p>
                </>
              );
              const cls = `rounded-2xl border p-4 ${diagnosticTone(item.tone)}`;
              return item.href ? <Link key={`${item.label}-${item.value}`} href={item.href} className={`${cls} transition hover:shadow-md`}>{card}</Link> : <div key={`${item.label}-${item.value}`} className={cls}>{card}</div>;
            })}
          </div>
        </details>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <h2 className="text-base font-black text-zinc-950">Registros</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Busque, filtre e exporte sem abrir controles desnecessários.</p>
          </div>
          {data.actions.length > 3 ? (
            <details className="relative">
              <summary className="cursor-pointer list-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50">Mais ações</summary>
              <div className="absolute right-0 z-20 mt-2 w-64 space-y-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl">
                {data.actions.slice(3).map((action) => <AdminMasterModuleActionButton key={action} action={action} variant="list" />)}
              </div>
            </details>
          ) : null}
        </div>
        <AdminMasterDataTableClient
          rows={data.rows}
          columns={data.columns}
          emptyTitle={`Nenhum registro em ${data.title}.`}
          emptyDescription="Não há itens para mostrar com os filtros atuais. Isso também pode ser normal quando o módulo ainda não recebeu dados."
        />
      </section>
    </div>
  );
}

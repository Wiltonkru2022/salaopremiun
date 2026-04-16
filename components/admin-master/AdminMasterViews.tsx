import Link from "next/link";
import type { AdminKpi, AdminSectionData, AdminTableRow } from "@/lib/admin-master/data";

function toneClass(tone?: AdminKpi["tone"]) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "amber") return "border-amber-200 bg-amber-50 text-amber-900";
  if (tone === "red") return "border-red-200 bg-red-50 text-red-900";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-900";
  return "border-zinc-200 bg-white text-zinc-950";
}

export function AdminKpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`rounded-[28px] border p-5 shadow-sm ${toneClass(kpi.tone)}`}
        >
          <div className="text-xs font-bold uppercase tracking-[0.28em] opacity-60">
            {kpi.label}
          </div>
          <div className="mt-3 font-display text-3xl font-black">{kpi.value}</div>
          <div className="mt-2 text-sm opacity-70">{kpi.hint}</div>
        </div>
      ))}
    </div>
  );
}

export function AdminDataTable({
  rows,
  columns,
}: {
  rows: AdminTableRow[];
  columns: string[];
}) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-zinc-200 bg-white shadow-sm">
      <div className="scroll-premium overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-100 text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-[0.2em] text-zinc-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-bold">
                  {column.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={index} className="hover:bg-zinc-50/80">
                  {columns.map((column) => (
                    <td key={column} className="max-w-[260px] truncate px-5 py-4">
                      {String(row[column] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-10 text-center text-zinc-500">
                  Nenhum registro encontrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSectionView({ data }: { data: AdminSectionData }) {
  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
              AdminMaster
            </div>
            <h2 className="mt-3 font-display text-4xl font-black">{data.title}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              {data.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {data.actions.slice(0, 3).map((action) => (
              <button
                key={action}
                type="button"
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </section>

      <AdminKpiGrid kpis={data.kpis} />

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <AdminDataTable rows={data.rows} columns={data.columns} />

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-400">
              Acoes do modulo
            </div>
            <div className="mt-4 space-y-2">
              {data.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-left text-sm font-bold text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <div className="text-sm font-black">Regra de seguranca</div>
            <p className="mt-2 text-sm leading-6">
              Toda acao critica do AdminMaster deve passar pelo servidor,
              validar permissao interna e registrar auditoria.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}

export function AdminDashboardView({
  kpis,
  recentes,
  planos,
}: {
  kpis: AdminKpi[];
  recentes: AdminTableRow[];
  planos: AdminTableRow[];
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[36px] bg-zinc-950 p-7 text-white shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.35em] text-amber-200">
              Centro total de comando
            </div>
            <h2 className="mt-3 font-display text-5xl font-black">
              AdminMaster SalaoPremium
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-zinc-300">
              Controle saloes, assinaturas, cobrancas, suporte, operacao,
              planos, recursos, WhatsApp, campanhas e trial automatico em um
              painel unico.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/10 p-5">
            <div className="text-sm font-bold text-amber-100">Acoes rapidas</div>
            <div className="mt-4 grid gap-2">
              {[
                ["Novo comunicado", "/admin-master/notificacoes"],
                ["Ver saloes em risco", "/admin-master/alertas"],
                ["Planos e recursos", "/admin-master/planos"],
                ["Tickets urgentes", "/admin-master/tickets"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-950"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AdminKpiGrid kpis={kpis} />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-black">Saloes recentes</h3>
          <AdminDataTable
            rows={recentes}
            columns={["salao", "responsavel", "plano", "status", "criado"]}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-2xl font-black">Planos ativos</h3>
          <AdminDataTable
            rows={planos}
            columns={["codigo", "nome", "valor_mensal", "destaque"]}
          />
        </div>
      </section>
    </div>
  );
}

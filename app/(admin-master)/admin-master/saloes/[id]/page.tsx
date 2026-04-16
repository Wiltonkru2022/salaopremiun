import Link from "next/link";
import { AdminDataTable, AdminKpiGrid } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSalaoDetail } from "@/lib/admin-master/data";

export const dynamic = "force-dynamic";

export default async function AdminMasterSalaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getAdminMasterSalaoDetail(id);
  const salao = data.salao || {};
  const assinatura = data.assinatura || {};

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <Link href="/admin-master/saloes" className="text-sm font-bold text-amber-200">
          Voltar para saloes
        </Link>
        <h2 className="mt-4 font-display text-4xl font-black">
          {String(salao.nome || "Salao")}
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          {String(salao.responsavel || "-")} · {String(salao.email || "-")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Entrar como salao", "Trocar plano", "Bloquear/desbloquear", "Criar ticket"].map(
            (action) => (
              <button
                key={action}
                type="button"
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white"
              >
                {action}
              </button>
            )
          )}
        </div>
      </section>

      <AdminKpiGrid
        kpis={[
          {
            label: "Plano",
            value: data.access.planoNome,
            hint: data.access.planoCodigo,
            tone: "blue",
          },
          {
            label: "Assinatura",
            value: data.access.assinaturaStatus || "-",
            hint: data.access.bloqueioTotal ? "Bloqueio total" : "Operacao liberada",
            tone: data.access.bloqueioTotal ? "red" : "green",
          },
          {
            label: "Profissionais",
            value: `${data.access.uso.profissionais}/${data.access.limites.profissionais ?? "∞"}`,
            hint: "Uso do limite do plano",
            tone: "dark",
          },
          {
            label: "Usuarios",
            value: `${data.access.uso.usuarios}/${data.access.limites.usuarios ?? "∞"}`,
            hint: "Uso do limite do plano",
            tone: "dark",
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-2xl font-black">Assinatura</h3>
          <div className="mt-4 grid gap-3 text-sm">
            {["plano", "status", "valor", "vencimento_em", "renovacao_automatica"].map(
              (key) => (
                <div key={key} className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="font-semibold text-zinc-500">{key}</span>
                  <span className="font-bold">{String(assinatura[key] ?? "-")}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-2xl font-black">Recursos bloqueados</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {data.access.recursosBloqueados.length ? (
              data.access.recursosBloqueados.map((recurso) => (
                <span
                  key={recurso}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
                >
                  {recurso}
                </span>
              ))
            ) : (
              <span className="text-sm text-zinc-500">Tudo liberado.</span>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-3">
          <h3 className="font-display text-xl font-black">Cobrancas</h3>
          <AdminDataTable
            rows={data.cobrancas}
            columns={["referencia", "valor", "status", "data_expiracao", "pago_em"]}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-xl font-black">Tickets</h3>
          <AdminDataTable
            rows={data.tickets}
            columns={["numero", "assunto", "status", "prioridade", "criado_em"]}
          />
        </div>
        <div className="space-y-3">
          <h3 className="font-display text-xl font-black">Notas internas</h3>
          <AdminDataTable
            rows={data.anotacoes}
            columns={["titulo", "nota", "criada_em"]}
          />
        </div>
      </section>
    </div>
  );
}

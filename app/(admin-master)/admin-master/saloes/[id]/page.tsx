import Link from "next/link";
import AdminMasterSalaoActions from "@/components/admin-master/AdminMasterSalaoActions";
import { AdminDataTable, AdminKpiGrid } from "@/components/admin-master/AdminMasterViews";
import { getAdminMasterSalaoDetail } from "@/lib/admin-master/data";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

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

  const planos = await runAdminOperation({
    action: "admin_master_salao_detail_listar_planos",
    idSalao: id,
    run: async (supabase) => {
      const { data: planosData } = await supabase
        .from("planos_saas")
        .select("codigo, nome")
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      return planosData ?? [];
    },
  });

  const planosOptions = ((planos || []) as { codigo?: string | null; nome?: string | null }[])
    .filter((plano) => plano.codigo && plano.nome)
    .map((plano) => ({
      codigo: String(plano.codigo),
      nome: String(plano.nome),
    }));

  const statusSalao = String(salao.status || data.access.salaoStatus || "-");
  const planoAtual = String(assinatura.plano || data.access.planoCodigo || "basico");
  const vencimentoAtual = String(assinatura.vencimento_em || "");
  const cartaoRecorrente = assinatura.asaas_credit_card_last4
    ? `${String(assinatura.asaas_credit_card_brand || "CARTAO")} •••• ${String(
        assinatura.asaas_credit_card_last4 || ""
      )}`
    : "-";

  return (
    <div className="space-y-6">
      <section className="rounded-[34px] bg-zinc-950 p-7 text-white shadow-sm">
        <Link
          href="/admin-master/saloes"
          className="text-sm font-bold text-amber-200"
        >
          Voltar para saloes
        </Link>
        <h2 className="mt-4 font-display text-4xl font-black">
          {String(salao.nome || "Salao")}
        </h2>
        <p className="mt-2 text-sm text-zinc-300">
          {String(salao.responsavel || "-")} | {String(salao.email || "-")}
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-300">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
            Status {statusSalao}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-2">
            Plano {planoAtual}
          </span>
        </div>
      </section>

      <AdminMasterSalaoActions
        idSalao={id}
        statusSalao={statusSalao}
        planoAtual={planoAtual}
        vencimentoAtual={vencimentoAtual}
        planos={planosOptions}
      />

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
            value: `${data.access.uso.profissionais}/${data.access.limites.profissionais ?? "Ilimitado"}`,
            hint: "Uso do limite do plano",
            tone: "dark",
          },
          {
            label: "Usuarios",
            value: `${data.access.uso.usuarios}/${data.access.limites.usuarios ?? "Ilimitado"}`,
            hint: "Uso do limite do plano",
            tone: "dark",
          },
        ]}
      />

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="font-display text-2xl font-black">Assinatura</h3>
          <div className="mt-4 grid gap-3 text-sm">
            {[
              ["plano", assinatura.plano],
              ["status", assinatura.status],
              ["valor", assinatura.valor],
              ["vencimento_em", assinatura.vencimento_em],
              ["renovacao_automatica", assinatura.renovacao_automatica],
              ["asaas_subscription_id", assinatura.asaas_subscription_id],
              ["cartao_recorrente", cartaoRecorrente],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex justify-between border-b border-zinc-100 pb-2"
              >
                <span className="font-semibold text-zinc-500">
                  {String(label)}
                </span>
                <span className="font-bold">{String(value ?? "-")}</span>
              </div>
            ))}
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

import ProfissionalPrivate from "@/components/profissional/layout/ProfissionalPrivate";
import ProfissionalStatCard from "@/components/profissional/cards/ProfissionalStatCard";
import { requireProfissionalSession } from "@/lib/profissional-auth.server";
import { buscarResumoComissaoProfissional } from "@/app/services/profissional/comissao";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(valor?: string | null) {
  if (!valor) return "-";

  const date = new Date(`${valor}T12:00:00`);
  return Number.isNaN(date.getTime()) ? valor : date.toLocaleDateString("pt-BR");
}

function getStatusBadge(status?: string | null) {
  const value = String(status || "").toLowerCase();

  if (value === "pago") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "cancelado") {
    return "border-zinc-200 bg-zinc-100 text-zinc-500";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default async function ComissaoProfissionalPage() {
  const session = await requireProfissionalSession();
  const resumo = await buscarResumoComissaoProfissional(
    session.idSalao,
    session.idProfissional
  );

  return (
    <ProfissionalPrivate
      title="Comissao"
      subtitle="Resumo dos seus repasses e lancamentos"
    >
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3">
          <ProfissionalStatCard
            label="Comissao do mes"
            value={formatarMoeda(resumo.totalMes)}
            helper={`${resumo.totalLancamentos} lancamentos`}
          />
          <ProfissionalStatCard
            label="Pago"
            value={formatarMoeda(resumo.totalPago)}
            helper="Total liberado"
          />
          <ProfissionalStatCard
            label="Pendente"
            value={formatarMoeda(resumo.totalPendente)}
            helper="Aguardando repasse"
          />
          <ProfissionalStatCard
            label="Ticket medio"
            value={formatarMoeda(resumo.ticketMedio)}
            helper="Base por lancamento"
          />
        </section>

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Lancamentos recentes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Valores reais calculados no seu salao.
              </p>
            </div>

            <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
              {resumo.itens.length} item(ns)
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {resumo.itens.length ? (
              resumo.itens.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        {item.descricao || "Comissao registrada"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Competencia {formatarData(item.competenciaData)} - Base{" "}
                        {formatarMoeda(item.valorBase)} - {item.percentualAplicado.toFixed(2)}%
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${getStatusBadge(
                        item.status
                      )}`}
                    >
                      {item.status || "pendente"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-500">
                      {item.pagoEm
                        ? `Pago em ${formatarData(item.pagoEm)}`
                        : `Competencia ${formatarData(item.competenciaData)}`}
                    </span>
                    <strong className="text-base text-zinc-950">
                      {formatarMoeda(item.valor)}
                    </strong>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">
                Ainda nao ha lancamentos de comissao para este profissional.
              </div>
            )}
          </div>
        </section>
      </div>
    </ProfissionalPrivate>
  );
}

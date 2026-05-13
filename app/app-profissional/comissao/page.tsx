import ProfissionalPrivate from "@/components/profissional/layout/ProfissionalPrivate";
import ProfissionalStatCard from "@/components/profissional/cards/ProfissionalStatCard";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import {
  buscarResumoComissaoProfissional,
  RESUMO_COMISSAO_VAZIO,
} from "@/app/services/profissional/comissao";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(valor) ? valor : 0);
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
  const session = await requireProfissionalAppContext();
  const resumo = await buscarResumoComissaoProfissional(
    session.idSalao,
    session.idProfissional
  ).catch((error) => ({
    ...RESUMO_COMISSAO_VAZIO,
    erro:
      error instanceof Error
        ? error.message
        : "Não foi possível carregar os repasses agora.",
  }));

  return (
    <ProfissionalPrivate
      title="Comissões"
      subtitle="Resumo dos seus repasses e lançamentos"
    >
      <div className="space-y-4">
        {resumo.erro ? (
          <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800 shadow-sm">
            Não foi possível atualizar os lançamentos agora. A tela continua
            disponível para você acompanhar os valores quando a conexão voltar.
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-2.5">
          <ProfissionalStatCard
            label="Comissão do mês"
            value={formatarMoeda(resumo.totalMes)}
            helper={`${resumo.totalLancamentos} lançamento(s)`}
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
            label="Ticket médio"
            value={formatarMoeda(resumo.ticketMedio)}
            helper="Base por lançamento"
          />
        </section>

        <section className="rounded-[1.4rem] border border-zinc-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Lançamentos recentes
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Valores reais calculados no seu salão.
              </p>
            </div>

            <div className="rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600">
              {resumo.itens.length} item(ns)
            </div>
          </div>

          <div className="mt-3.5 space-y-2.5">
            {resumo.itens.length ? (
              resumo.itens.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.15rem] border border-zinc-200 bg-zinc-50 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-950">
                        {item.descricao || "Comissão registrada"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Competência {formatarData(item.competenciaData)} - Base{" "}
                        {formatarMoeda(item.valorBase)} -{" "}
                        {Number(item.percentualAplicado || 0).toFixed(2)}%
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

                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-500">
                      {item.pagoEm
                        ? `Pago em ${formatarData(item.pagoEm)}`
                        : `Competência ${formatarData(item.competenciaData)}`}
                    </span>
                    <strong className="text-base text-zinc-950">
                      {formatarMoeda(item.valor)}
                    </strong>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[1.15rem] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                Ainda não há lançamentos de comissão para este profissional.
              </div>
            )}
          </div>
        </section>
      </div>
    </ProfissionalPrivate>
  );
}

"use client";

import type { BillingType } from "./types";

type Props = {
  podeGerenciar: boolean;
  erro: string;
  resumoAssinatura: {
    ativa: boolean;
    vencida: boolean;
    vencendoLogo: boolean;
    diasRestantes: number | null;
    diasAtraso: number | null;
    vencimentoEm: string | null;
    bloqueioTotal: boolean;
  };
  mostrarBotaoRegularizar: boolean;
  mostrarBotaoIniciarTrial: boolean;
  gerandoCobranca: boolean;
  iniciandoTrial: boolean;
  billingType: BillingType;
  criarCobrancaAssinatura: () => void;
  iniciarTrial: () => void;
  aguardandoPagamento: boolean;
  verificandoAgora: boolean;
  verificarPagamentoAgora: () => void;
};

function LoadingDot({ dark = false }: { dark?: boolean }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 ${
        dark
          ? "border-zinc-400/40 border-t-zinc-800"
          : "border-white/40 border-t-white"
      }`}
    />
  );
}

export default function AssinaturaStatusCard({
  podeGerenciar,
  erro,
  resumoAssinatura,
  mostrarBotaoRegularizar,
  mostrarBotaoIniciarTrial,
  gerandoCobranca,
  iniciandoTrial,
  billingType,
  criarCobrancaAssinatura,
  iniciarTrial,
  aguardandoPagamento,
  verificandoAgora,
  verificarPagamentoAgora,
}: Props) {
  return (
    <div className="space-y-4">
      {!podeGerenciar ? (
        <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          Voce esta em modo de <strong>somente leitura</strong>.
        </div>
      ) : null}

      {erro ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      {resumoAssinatura.bloqueioTotal ? (
        <section className="overflow-hidden rounded-[26px] border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-red-600">
                Bloqueio automatico
              </div>
              <h2 className="mt-2 text-2xl font-bold">
                Seu acesso principal esta bloqueado
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700">
                A assinatura passou do limite permitido sem regularizacao. Para
                liberar novamente o painel, gere uma nova cobranca e conclua o
                pagamento.
              </p>
            </div>

            {mostrarBotaoRegularizar ? (
              <button
                type="button"
                onClick={criarCobrancaAssinatura}
                disabled={gerandoCobranca}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
              >
                {gerandoCobranca ? <LoadingDot dark /> : null}

                {gerandoCobranca
                  ? billingType === "PIX"
                    ? "Gerando PIX..."
                    : billingType === "BOLETO"
                      ? "Gerando boleto..."
                      : "Gerando cobranca no cartao..."
                  : billingType === "PIX"
                    ? "Regularizar com PIX"
                    : billingType === "BOLETO"
                      ? "Regularizar com boleto"
                      : "Regularizar no cartao"}
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-bold text-zinc-950">
          Situacao da assinatura
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          Acompanhe periodo de uso, vencimento, risco de bloqueio e renovacao.
        </div>

        <div className="mt-4 space-y-3">
          {resumoAssinatura.vencida ? (
            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Sua assinatura esta vencida
              {resumoAssinatura.diasAtraso != null
                ? ` ha ${resumoAssinatura.diasAtraso} dia(s).`
                : "."}
            </div>
          ) : resumoAssinatura.vencendoLogo ? (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Sua assinatura vence em
              {resumoAssinatura.diasRestantes != null
                ? ` ${resumoAssinatura.diasRestantes} dia(s).`
                : " breve."}
            </div>
          ) : resumoAssinatura.ativa ? (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Sua assinatura esta ativa e liberada.
            </div>
          ) : (
            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              Nenhuma assinatura ativa no momento.
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {mostrarBotaoIniciarTrial ? (
              <button
                type="button"
                onClick={iniciarTrial}
                disabled={iniciandoTrial}
                className="rounded-2xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
              >
                {iniciandoTrial ? "Iniciando teste..." : "Comecar 7 dias gratis"}
              </button>
            ) : null}

            {mostrarBotaoRegularizar ? (
              <button
                type="button"
                onClick={criarCobrancaAssinatura}
                disabled={gerandoCobranca}
                className="inline-flex items-center gap-3 rounded-2xl bg-violet-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
              >
                {gerandoCobranca ? <LoadingDot /> : null}

                {gerandoCobranca
                  ? billingType === "PIX"
                    ? "Gerando PIX..."
                    : billingType === "BOLETO"
                      ? "Gerando boleto..."
                      : "Gerando cobranca no cartao..."
                  : billingType === "PIX"
                    ? "Gerar PIX"
                    : billingType === "BOLETO"
                      ? "Gerar boleto"
                      : "Gerar cobranca no cartao"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {aguardandoPagamento && podeGerenciar ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold">
                Aguardando confirmacao do pagamento...
              </div>
              <div className="text-xs text-amber-700">
                O sistema esta consultando automaticamente. Voce tambem pode
                verificar manualmente.
              </div>
            </div>

            <button
              type="button"
              onClick={verificarPagamentoAgora}
              disabled={verificandoAgora}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {verificandoAgora ? <LoadingDot dark /> : null}
              {verificandoAgora ? "Verificando..." : "Verificar agora"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

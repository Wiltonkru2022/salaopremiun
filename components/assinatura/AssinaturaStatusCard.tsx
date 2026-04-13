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
          Você está em modo de <strong>somente leitura</strong>.
        </div>
      ) : null}

      {erro ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-bold text-zinc-950">
          Situação da assinatura
        </div>
        <div className="mt-1 text-sm text-zinc-500">
          Acompanhe seu período de uso, vencimento e renovação.
        </div>

        <div className="mt-5 space-y-3">
          {resumoAssinatura.vencida ? (
            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Sua assinatura está vencida
              {resumoAssinatura.diasAtraso != null
                ? ` há ${resumoAssinatura.diasAtraso} dia(s).`
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
              Sua assinatura está ativa.
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
                className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
              >
                {iniciandoTrial ? "Iniciando teste..." : "Começar 7 dias grátis"}
              </button>
            ) : null}

            {mostrarBotaoRegularizar ? (
              <button
                type="button"
                onClick={criarCobrancaAssinatura}
                disabled={gerandoCobranca}
                className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:opacity-60"
              >
                {gerandoCobranca
                  ? "Gerando cobrança..."
                  : billingType === "PIX"
                  ? "Gerar PIX"
                  : billingType === "BOLETO"
                  ? "Gerar boleto"
                  : "Gerar cobrança no cartão"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {aguardandoPagamento && podeGerenciar ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">
                Aguardando confirmação do pagamento...
              </div>
              <div className="text-xs text-amber-700">
                Assim que o gateway confirmar, a assinatura será atualizada.
              </div>
            </div>

            <button
              type="button"
              onClick={verificarPagamentoAgora}
              disabled={verificandoAgora}
              className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {verificandoAgora ? "Verificando..." : "Verificar agora"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
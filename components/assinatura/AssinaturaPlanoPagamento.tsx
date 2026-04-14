"use client";

import type { BillingType, CardForm } from "./types";
import { PLANOS_INFO } from "./types";
import {
  formatarAno,
  formatarCvv,
  formatarMes,
  formatarMoeda,
  formatarNumeroCartao,
} from "./utils";

type Props = {
  podeGerenciar: boolean;
  planoSelecionado: string;
  setPlanoSelecionado: React.Dispatch<React.SetStateAction<string>>;
  planoAtual: string | null;
  billingType: BillingType;
  setBillingType: React.Dispatch<React.SetStateAction<BillingType>>;
  cardForm: CardForm;
  setCardForm: React.Dispatch<React.SetStateAction<CardForm>>;
  esconderBotaoPadraoRenovacao: boolean;
  gerandoCobranca: boolean;
  criarCobrancaAssinatura: () => Promise<void>;
};

function StepBadge({ numero }: { numero: number }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-700 text-sm font-bold text-white shadow-sm">
      {numero}
    </div>
  );
}

function getMovimentoPlano(planoAtual: string | null, planoSelecionado: string) {
  const infoAtual = planoAtual ? PLANOS_INFO[planoAtual] : null;
  const infoSelecionado = PLANOS_INFO[planoSelecionado];

  if (!infoAtual || !infoSelecionado) {
    return null;
  }

  const ordemAtual = infoAtual.ordem;
  const ordemSelecionada = infoSelecionado.ordem;

  if (ordemSelecionada > ordemAtual) {
    return {
      label: "Upgrade",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (ordemSelecionada < ordemAtual) {
    return {
      label: "Downgrade",
      className: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  return {
    label: "Plano atual",
    className: "border-violet-200 bg-violet-50 text-violet-700",
  };
}

export default function AssinaturaPlanosPagamento({
  podeGerenciar,
  planoSelecionado,
  setPlanoSelecionado,
  planoAtual,
  billingType,
  setBillingType,
  cardForm,
  setCardForm,
  esconderBotaoPadraoRenovacao,
  gerandoCobranca,
  criarCobrancaAssinatura,
}: Props) {
  if (esconderBotaoPadraoRenovacao) {
    return (
      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950">
          Gerenciar assinatura
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Seu teste grátis está ativo. Quando ele terminar, o sistema libera a
          escolha de plano e a cobrança aqui.
        </p>

        <div className="mt-8 rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          Nenhuma cobrança disponível no momento.
        </div>
      </section>
    );
  }

  const movimentoPlano = getMovimentoPlano(planoAtual, planoSelecionado);

  return (
    <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950">
            Comece ou renove seu acesso
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Escolha o plano ideal para o seu salão e depois a forma de pagamento.
          </p>
        </div>

        {movimentoPlano ? (
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${movimentoPlano.className}`}
          >
            {movimentoPlano.label}
          </span>
        ) : null}
      </div>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <StepBadge numero={1} />
          <div>
            <div className="text-lg font-bold text-zinc-950">
              Escolha o plano ideal para você
            </div>
            <div className="text-sm text-zinc-500">
              Todos os planos liberam o sistema. O que muda é o limite e a estrutura.
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {(["basico", "pro", "premium"] as string[]).map((plano) => {
            const info = PLANOS_INFO[plano];
            const ativo = planoSelecionado === plano;
            const badge = getMovimentoPlano(planoAtual, plano);

            if (!info) return null;

            return (
              <button
                key={plano}
                type="button"
                onClick={() => {
                  if (podeGerenciar) setPlanoSelecionado(plano);
                }}
                disabled={!podeGerenciar}
                className={`relative min-h-[240px] rounded-[26px] border p-6 text-left transition ${
                  ativo
                    ? "border-violet-600 bg-[linear-gradient(135deg,#5b21b6_0%,#6d28d9_60%,#7c3aed_100%)] text-white shadow-lg"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-violet-300 hover:shadow-sm"
                } ${!podeGerenciar ? "cursor-not-allowed opacity-70" : ""}`}
              >
                <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
                  {ativo ? (
                    <div className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                      Selecionado
                    </div>
                  ) : null}

                  {badge ? (
                    <div
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        ativo
                          ? "bg-white/15 text-white"
                          : badge.className.replace("border ", "")
                      }`}
                    >
                      {badge.label}
                    </div>
                  ) : null}
                </div>

                <div className="text-3xl font-bold leading-none">{info.nome}</div>

                <div className={`mt-4 text-base ${ativo ? "text-violet-100" : "text-zinc-500"}`}>
                  {info.descricao}
                </div>

                <div className="mt-6 text-4xl font-bold">
                  {formatarMoeda(info.valor)}
                </div>

                <div className={`mt-6 space-y-2 text-sm ${ativo ? "text-violet-100" : "text-zinc-600"}`}>
                  {info.recursos.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-3">
          <StepBadge numero={2} />
          <div>
            <div className="text-lg font-bold text-zinc-950">
              Selecione a forma de pagamento
            </div>
            <div className="text-sm text-zinc-500">
              PIX costuma confirmar mais rápido. Boleto e cartão também estão disponíveis.
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {([
            {
              tipo: "PIX" as BillingType,
              titulo: "PIX",
              subtitulo: "Pagamento rápido com confirmação normalmente mais ágil.",
            },
            {
              tipo: "BOLETO" as BillingType,
              titulo: "Boleto",
              subtitulo: "A compensação pode levar mais tempo.",
            },
            {
              tipo: "CREDIT_CARD" as BillingType,
              titulo: "Cartão de crédito",
              subtitulo: "Pode passar por validação do gateway.",
            },
          ]).map((item) => {
            const ativo = billingType === item.tipo;

            return (
              <button
                key={item.tipo}
                type="button"
                onClick={() => {
                  if (podeGerenciar) setBillingType(item.tipo);
                }}
                disabled={!podeGerenciar}
                className={`flex w-full items-center justify-between rounded-[22px] border px-5 py-4 text-left transition ${
                  ativo
                    ? "border-violet-500 bg-violet-50 text-violet-900 shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-950 hover:border-violet-300"
                }`}
              >
                <div>
                  <div className="text-lg font-bold">{item.titulo}</div>
                  <div className="mt-1 text-sm text-zinc-500">{item.subtitulo}</div>
                </div>

                {ativo ? (
                  <div className="rounded-full bg-violet-700 px-3 py-1 text-xs font-semibold text-white">
                    Selecionado
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {billingType === "CREDIT_CARD" ? (
        <div className="mt-8">
          <div className="text-lg font-bold text-zinc-950">
            Dados do cartão
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              placeholder="Nome impresso no cartão"
              value={cardForm.holderName}
              onChange={(e) =>
                setCardForm((prev) => ({
                  ...prev,
                  holderName: e.target.value,
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-600"
            />

            <input
              type="text"
              placeholder="Número do cartão"
              value={cardForm.number}
              onChange={(e) =>
                setCardForm((prev) => ({
                  ...prev,
                  number: formatarNumeroCartao(e.target.value),
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-600"
            />

            <input
              type="text"
              placeholder="Mês (MM)"
              value={cardForm.expiryMonth}
              onChange={(e) =>
                setCardForm((prev) => ({
                  ...prev,
                  expiryMonth: formatarMes(e.target.value),
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-600"
            />

            <input
              type="text"
              placeholder="Ano (AAAA)"
              value={cardForm.expiryYear}
              onChange={(e) =>
                setCardForm((prev) => ({
                  ...prev,
                  expiryYear: formatarAno(e.target.value),
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-600"
            />

            <input
              type="text"
              placeholder="CVV"
              value={cardForm.ccv}
              onChange={(e) =>
                setCardForm((prev) => ({
                  ...prev,
                  ccv: formatarCvv(e.target.value),
                }))
              }
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-600"
            />
          </div>
        </div>
      ) : null}

      <div className="mt-10">
        <div className="flex items-center gap-3">
          <StepBadge numero={3} />
          <div>
            <div className="text-lg font-bold text-zinc-950">
              Gerar cobrança
            </div>
            <div className="text-sm text-zinc-500">
              O checkout vai aparecer ao lado depois que a cobrança for criada.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            void criarCobrancaAssinatura();
          }}
          disabled={gerandoCobranca || !podeGerenciar}
          className="mt-5 inline-flex w-full items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#5b21b6_0%,#6d28d9_60%,#7c3aed_100%)] px-5 py-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {gerandoCobranca
            ? "Gerando cobrança..."
            : billingType === "PIX"
            ? "Gerar PIX"
            : billingType === "BOLETO"
            ? "Gerar boleto"
            : "Gerar cobrança no cartão"}
        </button>
      </div>
    </section>
  );
}
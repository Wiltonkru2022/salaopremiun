"use client";

import { useState } from "react";
import type { CheckoutResponse } from "./types";
import { formatarData, formatarMoeda, getNomePlano } from "./utils";

type Props = {
  checkout: CheckoutResponse | null;
  copiarPix: () => Promise<void>;
  planoAtual?: string | null;
  planoSelecionado?: string | null;
};

function getPlanoOrder(plano?: string | null) {
  const normalized = String(plano || "").toLowerCase();
  if (normalized === "basico") return 1;
  if (normalized === "pro") return 2;
  if (normalized === "premium") return 3;
  return 0;
}

export default function AssinaturaCheckoutBox({
  checkout,
  copiarPix,
  planoAtual,
  planoSelecionado,
}: Props) {
  const [pixCopiado, setPixCopiado] = useState(false);
  const linkPrincipal = checkout?.bankSlipUrl || checkout?.invoiceUrl || null;
  const statusNormalizado = String(checkout?.status || "").toLowerCase();
  const checkoutPendente = [
    "pending",
    "pendente",
    "aguardando_pagamento",
  ].includes(statusNormalizado);
  const checkoutPago = [
    "received",
    "confirmed",
    "pago",
    "paid",
    "ativo",
  ].includes(statusNormalizado);

  async function handleCopiarPix() {
    await copiarPix();
    setPixCopiado(true);
    window.setTimeout(() => setPixCopiado(false), 2200);
  }

  function getPaymentGuidance() {
    if (!checkout) return null;

    if (checkoutPago) {
      return {
        title: "Pagamento identificado",
        body:
          "A cobrança já aparece como paga ou confirmada. Se o acesso ainda não liberou, use Verificar agora ou aguarde o webhook concluir.",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }

    if (checkout.billingType === "PIX") {
      return {
        title: checkout.reused
          ? "PIX já gerado para este salão"
          : "PIX pronto para pagamento",
        body:
          "Use o QR Code ou o copia e cola. A liberação costuma acontecer em poucos minutos após a confirmação do Asaas.",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }

    if (checkout.billingType === "BOLETO") {
      return {
        title: checkout.reused
          ? "Boleto já gerado para este salão"
          : "Boleto pronto para pagamento",
        body:
          "Abra o boleto ou a fatura. A compensação pode levar mais tempo que PIX, então mantenha o cliente informado.",
        className: "border-amber-200 bg-amber-50 text-amber-900",
      };
    }

    return {
      title: checkout.reused
        ? "Cobrança no cartão reaproveitada"
        : "Cobrança no cartão criada",
      body:
        "A transação pode passar por validação do gateway. Se ficar pendente, aguarde alguns segundos e verifique novamente.",
      className: "border-blue-200 bg-blue-50 text-blue-900",
    };
  }

  function getPlanoGuidance() {
    if (!checkout) return null;

    const ordemAtual = getPlanoOrder(planoAtual);
    const ordemSelecionada = getPlanoOrder(planoSelecionado || checkout.plano);
    const nomeAtual = getNomePlano(planoAtual);
    const nomeSelecionado = getNomePlano(planoSelecionado || checkout.plano);

    if (!ordemSelecionada) return null;

    if (!ordemAtual || nomeAtual === "-") {
      return {
        title: `Assinatura do ${nomeSelecionado}`,
        body:
          "Esta cobrança cria o primeiro plano pago do salão. Depois da confirmação, a assinatura segue normalmente com esse plano.",
        className: "border-sky-200 bg-sky-50 text-sky-900",
      };
    }

    if (ordemSelecionada > ordemAtual) {
      return {
        title: `Upgrade para ${nomeSelecionado}`,
        body:
          "A troca de plano já fica registrada quando a cobrança é gerada. Se o pagamento ficar pendente, a assinatura também fica pendente até a confirmação.",
        className: "border-emerald-200 bg-emerald-50 text-emerald-900",
      };
    }

    if (ordemSelecionada < ordemAtual) {
      return {
        title: `Downgrade para ${nomeSelecionado}`,
        body:
          `O sistema já registra a troca saindo de ${nomeAtual}. Se a cobrança ficar pendente, o salão continua com a assinatura em status pendente até a confirmação do pagamento.`,
        className: "border-amber-200 bg-amber-50 text-amber-900",
      };
    }

    return {
      title: `Renovação do ${nomeSelecionado}`,
      body:
        "Essa cobrança mantém o plano atual. O que muda é só o próximo ciclo da assinatura.",
      className: "border-zinc-200 bg-zinc-50 text-zinc-800",
    };
  }

  const paymentGuidance = getPaymentGuidance();
  const planoGuidance = getPlanoGuidance();

  return (
    <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-3xl font-bold tracking-tight text-zinc-950">
        Checkout
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        Aqui aparece a cobrança gerada para pagamento.
      </p>

      {!checkout ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
          Nenhuma cobrança gerada ainda.
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {planoGuidance ? (
            <div className={`rounded-[22px] border p-4 ${planoGuidance.className}`}>
              <div className="text-sm font-black">{planoGuidance.title}</div>
              <p className="mt-2 text-sm leading-6">{planoGuidance.body}</p>
            </div>
          ) : null}

          {paymentGuidance ? (
            <div
              className={`rounded-[22px] border p-4 ${paymentGuidance.className}`}
            >
              <div className="text-sm font-black">{paymentGuidance.title}</div>
              <p className="mt-2 text-sm leading-6">{paymentGuidance.body}</p>
              {checkout.reused ? (
                <div className="mt-3 rounded-2xl border border-current/20 bg-white/50 px-3 py-2 text-xs font-semibold">
                  O sistema reaproveitou uma cobrança existente para evitar
                  duplicidade.
                  {checkout.reason
                    ? ` Motivo técnico: ${checkout.reason}.`
                    : ""}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Status
              </div>
              <div className="mt-2 text-lg font-bold text-zinc-950">
                {checkout.status || "-"}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {checkoutPendente
                  ? "Aguardando confirmação do gateway"
                  : checkoutPago
                    ? "Confirmação recebida"
                    : "Acompanhe pelo histórico"}
              </div>
            </div>

            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Valor
              </div>
              <div className="mt-2 text-lg font-bold text-zinc-950">
                {formatarMoeda(checkout.valor)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Vencimento: {formatarData(checkout.vencimento)}
              </div>
            </div>
          </div>

          {checkout.paymentId ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Código da cobrança
              </div>
              <div className="mt-2 break-all font-mono text-xs text-zinc-700">
                {checkout.paymentId}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Use este código para localizar rapidamente no Admin Master ou no
                Asaas.
              </div>
            </div>
          ) : null}

          {checkout.qrCodeBase64 ? (
            <div className="rounded-[22px] border border-zinc-200 bg-white p-5">
              <div className="text-sm font-semibold text-zinc-900">
                QR Code PIX
              </div>

              <img
                src={`data:image/png;base64,${checkout.qrCodeBase64}`}
                alt="QR Code PIX"
                className="mx-auto mt-4 h-56 w-56 rounded-[22px] border border-zinc-200 bg-white p-3"
              />
            </div>
          ) : null}

          {checkout.pixCopiaCola ? (
            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-sm font-semibold text-zinc-900">
                PIX copia e cola
              </div>

              <div className="mt-3 break-all rounded-2xl border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
                {checkout.pixCopiaCola}
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleCopiarPix();
                }}
                className="mt-4 rounded-2xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600"
              >
                {pixCopiado ? "PIX copiado" : "Copiar PIX"}
              </button>
            </div>
          ) : null}

          {linkPrincipal ? (
            <div className="flex flex-wrap gap-3">
              {checkout.bankSlipUrl ? (
                <a
                  href={checkout.bankSlipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Abrir boleto
                </a>
              ) : null}

              {checkout.invoiceUrl ? (
                <a
                  href={checkout.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                >
                  Abrir fatura
                </a>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              A cobrança foi criada, mas o link do pagamento ainda não ficou
              disponível nesta tela. Você pode abrir pelo histórico de pagamentos.
            </div>
          )}
        </div>
      )}
    </section>
  );
}

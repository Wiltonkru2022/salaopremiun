"use client";

import type { CheckoutResponse } from "./types";
import { formatarData, formatarMoeda } from "./utils";

type Props = {
  checkout: CheckoutResponse | null;
  copiarPix: () => Promise<void>;
};

export default function AssinaturaCheckoutBox({
  checkout,
  copiarPix,
}: Props) {
  const linkPrincipal = checkout?.bankSlipUrl || checkout?.invoiceUrl || null;

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
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Status
              </div>
              <div className="mt-2 text-lg font-bold text-zinc-950">
                {checkout.status || "-"}
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
                  void copiarPix();
                }}
                className="mt-4 rounded-2xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-600"
              >
                Copiar PIX
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
              A cobrança foi criada, mas o link do pagamento ainda não ficou disponível nesta tela.
              Você pode abrir pelo histórico de pagamentos.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
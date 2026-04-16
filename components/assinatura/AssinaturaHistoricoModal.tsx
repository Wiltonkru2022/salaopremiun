"use client";

import AppModal from "@/components/ui/AppModal";
import {
  formatarData,
  formatarMoeda,
  getFormaPagamentoLabel,
  getNomePlano,
} from "./utils";
import type { HistoricoCobrancaRow } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  historico: HistoricoCobrancaRow[];
};

function getStatusLabel(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (["ativo", "paid", "pago", "received", "confirmed"].includes(s)) {
    return "Pago";
  }

  if (["pendente", "pending"].includes(s)) {
    return "Pendente";
  }

  if (["vencida", "overdue"].includes(s)) {
    return "Vencida";
  }

  if (["cancelada", "cancelled"].includes(s)) {
    return "Cancelada";
  }

  return status || "-";
}

function getStatusClass(status?: string | null) {
  const s = String(status || "").toLowerCase();

  if (["ativo", "paid", "pago", "received", "confirmed"].includes(s)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["pendente", "pending"].includes(s)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["vencida", "overdue"].includes(s)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (["cancelada", "cancelled"].includes(s)) {
    return "border-zinc-300 bg-zinc-100 text-zinc-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function getMovimentoLabel(tipo?: string | null) {
  const t = String(tipo || "").toLowerCase();

  if (t === "upgrade") return "Upgrade";
  if (t === "downgrade") return "Downgrade";
  return "Renovacao";
}

function getMovimentoClass(tipo?: string | null) {
  const t = String(tipo || "").toLowerCase();

  if (t === "upgrade") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (t === "downgrade") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-violet-200 bg-violet-50 text-violet-700";
}

export default function AssinaturaHistoricoModal({
  open,
  onClose,
  loading,
  historico,
}: Props) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Historico de pagamentos"
      description="Veja as cobrancas ja geradas da assinatura."
      maxWidthClassName="max-w-5xl"
      zIndexClassName="z-[120]"
      panelClassName="max-h-[90vh]"
      bodyClassName="max-h-[calc(90vh-168px)] overflow-y-auto p-6"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          Fechar
        </button>
      }
    >
      {loading ? (
        <div className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-8 text-sm text-zinc-500">
          Carregando historico...
        </div>
      ) : historico.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500">
          Nenhum historico encontrado.
        </div>
      ) : (
        <div className="space-y-4">
          {historico.map((item) => (
            <div
              key={item.id}
              className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Referencia
                  </div>
                  <div className="mt-2 text-lg font-bold text-zinc-950">
                    {item.referencia || item.id}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getMovimentoClass(
                      item.tipo_movimento
                    )}`}
                  >
                    {getMovimentoLabel(item.tipo_movimento)}
                  </span>

                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusClass(
                      item.status
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>

                  {item.gerada_automaticamente ? (
                    <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm font-semibold text-zinc-700">
                      Automatica
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Valor
                  </div>
                  <div className="mt-2 text-base font-bold text-zinc-950">
                    {formatarMoeda(item.valor)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Forma de pagamento
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {getFormaPagamentoLabel(item.forma_pagamento)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Vencimento
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {formatarData(item.data_expiracao)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Criada em
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {formatarData(item.created_at)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Pagamento
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {formatarData(item.payment_date)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Confirmacao
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {formatarData(item.confirmed_date)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Plano origem
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {getNomePlano(item.plano_origem)}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.20em] text-zinc-400">
                    Plano destino
                  </div>
                  <div className="mt-2 text-sm font-medium text-zinc-800">
                    {getNomePlano(item.plano_destino)}
                  </div>
                </div>
              </div>

              {item.bank_slip_url || item.invoice_url ? (
                <div className="mt-5 flex flex-wrap gap-3">
                  {item.bank_slip_url ? (
                    <a
                      href={item.bank_slip_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                    >
                      Abrir boleto
                    </a>
                  ) : null}

                  {item.invoice_url ? (
                    <a
                      href={item.invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                    >
                      Abrir fatura
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AppModal>
  );
}

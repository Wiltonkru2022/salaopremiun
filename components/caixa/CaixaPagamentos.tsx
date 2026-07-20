"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Info, Trash2 } from "lucide-react";
import { ComandaDetalhe, ComandaPagamento } from "./types";
import {
  formatCurrency,
  formatShortDateTime,
  moneyMask,
  parseMoney,
} from "./utils";

const FORMAS_PAGAMENTO = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Debito" },
  { value: "credito", label: "Credito" },
  { value: "transferencia", label: "Transferencia" },
  { value: "boleto", label: "Boleto" },
  { value: "outro", label: "Outro" },
  { value: "credito_cliente", label: "Credito da cliente" },
];

type Props = {
  comandaSelecionada: ComandaDetalhe | null;
  repassaTaxaCliente: boolean;
  pagamentos: ComandaPagamento[];
  formaPagamento: string;
  setFormaPagamento: (value: string) => void;
  valorPagamento: string;
  setValorPagamento: (value: string) => void;
  parcelas: string;
  setParcelas: (value: string) => void;
  taxaPercentual: string;
  setTaxaPercentual: (_value: string) => void;
  observacaoPagamento: string;
  setObservacaoPagamento: (value: string) => void;
  totalPago: number;
  totalCreditoGerado: number;
  faltaReceber: number;
  troco: number;
  creditoClienteDisponivel: number;
  saving: boolean;
  onAdicionarPagamento: (options?: {
    destinoExcedente?: "troco" | "credito_cliente";
  }) => Promise<void> | void;
  onRemoverPagamento: (idPagamento: string) => void;
  onCancelar: () => void;
};

function getFormaPagamentoLabel(value?: string | null) {
  const found = FORMAS_PAGAMENTO.find((item) => item.value === value);
  return found?.label || "Pagamento";
}

function getParcelasLabel(parcelas?: number | null) {
  if (!parcelas || parcelas <= 1) return "A vista";
  return `${parcelas}x`;
}

export default function CaixaPagamentos({
  comandaSelecionada,
  repassaTaxaCliente,
  pagamentos,
  formaPagamento,
  setFormaPagamento,
  valorPagamento,
  setValorPagamento,
  parcelas,
  setParcelas,
  taxaPercentual,
  setTaxaPercentual: _setTaxaPercentual,
  observacaoPagamento,
  setObservacaoPagamento,
  totalPago,
  totalCreditoGerado,
  faltaReceber,
  troco,
  creditoClienteDisponivel,
  saving,
  onAdicionarPagamento,
  onRemoverPagamento,
  onCancelar,
}: Props) {
  const [confirmarExcedenteOpen, setConfirmarExcedenteOpen] = useState(false);
  const [destinoExcedentePendente, setDestinoExcedentePendente] = useState<
    "troco" | "credito_cliente" | null
  >(null);

  const valorBaseDigitado = parseMoney(valorPagamento);
  const taxaPercentualNumero = parseMoney(taxaPercentual);
  const taxaPreviewValor = Number(
    ((valorBaseDigitado * taxaPercentualNumero) / 100).toFixed(2)
  );
  const valorTotalComTaxa = Number(
    (valorBaseDigitado + taxaPreviewValor).toFixed(2)
  );
  const valorCobradoCliente = repassaTaxaCliente
    ? valorTotalComTaxa
    : valorBaseDigitado;

  const podeEditar =
    comandaSelecionada &&
    comandaSelecionada.status !== "fechada" &&
    comandaSelecionada.status !== "cancelada";
  const exibeParcelas =
    formaPagamento === "credito" ||
    formaPagamento === "debito" ||
    formaPagamento === "boleto";
  const clienteNome = useMemo(
    () =>
      Array.isArray(comandaSelecionada?.clientes)
        ? comandaSelecionada?.clientes[0]?.nome || "Cliente"
        : comandaSelecionada?.clientes?.nome || "Cliente",
    [comandaSelecionada]
  );

  async function handleAdicionarPagamento() {
    if (saving || !comandaSelecionada || valorBaseDigitado <= 0) {
      return;
    }

    if (
      formaPagamento !== "credito_cliente" &&
      valorBaseDigitado > faltaReceber &&
      faltaReceber > 0
    ) {
      setConfirmarExcedenteOpen(true);
      return;
    }

    await onAdicionarPagamento();
  }

  async function handleConfirmarExcedente(
    destinoExcedente: "troco" | "credito_cliente"
  ) {
    if (saving) return;

    try {
      setDestinoExcedentePendente(destinoExcedente);
      await onAdicionarPagamento({ destinoExcedente });
      setConfirmarExcedenteOpen(false);
    } finally {
      setDestinoExcedentePendente(null);
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-sm text-slate-500">Falta a receber</div>
          <div className="mt-2 text-5xl font-bold tracking-[-0.05em] text-emerald-700">
            {formatCurrency(faltaReceber)}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900">
            Pagamentos adicionados
          </div>

          <div className="mt-3 space-y-2">
            {pagamentos.length === 0 ? (
              <div className="flex min-h-[72px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm text-slate-400">
                Nenhum pagamento lancado ainda.
              </div>
            ) : (
              pagamentos.map((pagamento) => (
                <div
                  key={pagamento.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {getFormaPagamentoLabel(pagamento.forma_pagamento)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                          {getParcelasLabel(pagamento.parcelas)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {formatShortDateTime(
                          pagamento.recebido_em || pagamento.created_at
                        )}
                      </div>
                      {pagamento.observacoes ? (
                        <div className="mt-1 text-sm text-slate-500">
                          {pagamento.observacoes}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatCurrency(pagamento.valor)}
                      </div>
                      {podeEditar ? (
                        <button
                          type="button"
                          onClick={() => onRemoverPagamento(pagamento.id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                          title="Remover pagamento"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {podeEditar ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Forma de pagamento">
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                >
                  {FORMAS_PAGAMENTO.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>

              <MoneyField
                label="Valor"
                value={valorPagamento}
                onChange={setValorPagamento}
              />

              {exibeParcelas ? (
                <Field label="Parcelas">
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={parcelas}
                    onChange={(e) => setParcelas(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                  />
                </Field>
              ) : null}

              <Field label="Observacao opcional">
                <input
                  value={observacaoPagamento}
                  onChange={(e) => setObservacaoPagamento(e.target.value)}
                  placeholder="Ex.: observacoes sobre o pagamento"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-900"
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {creditoClienteDisponivel > 0
                ? `${clienteNome} tem ${formatCurrency(creditoClienteDisponivel)} de credito disponivel.`
                : `${clienteNome} ainda nao tem credito disponivel.`}
            </div>

            <div className="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-sky-600" />
                <span>Credito disponivel: {formatCurrency(creditoClienteDisponivel)}</span>
              </div>
              <div className="text-right text-slate-700">
                Credito do cliente: {formatCurrency(totalCreditoGerado)}
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Total pago" value={formatCurrency(totalPago)} />
          <InfoRow label="Troco" value={formatCurrency(troco)} />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdicionarPagamento}
            disabled={saving || !comandaSelecionada || valorBaseDigitado <= 0}
            className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? "Processando..." : "Lancar recebimento"}
          </button>
        </div>
      </div>

      {confirmarExcedenteOpen ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[540px] rounded-[28px] border border-white/20 bg-white p-6 shadow-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Excedente no pagamento
            </div>
            <h3 className="mt-2 text-xl font-bold text-zinc-900">
              A cliente esta pagando mais do que falta
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Faltam {formatCurrency(faltaReceber)} e voce esta lancando{" "}
              {formatCurrency(valorCobradoCliente)}. O excedente de{" "}
              {formatCurrency(Math.max(valorBaseDigitado - faltaReceber, 0))} vai
              sair como troco ou ficar salvo como credito para {clienteNome}.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleConfirmarExcedente("troco")}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-left transition hover:bg-zinc-50"
              >
                <div className="text-sm font-semibold text-zinc-900">
                  {destinoExcedentePendente === "troco"
                    ? "Lancando troco..."
                    : "Dar troco"}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  O excedente continua como troco da venda.
                </div>
              </button>

              <button
                type="button"
                disabled={!comandaSelecionada?.id_cliente || saving}
                onClick={() => handleConfirmarExcedente("credito_cliente")}
                className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-emerald-900">
                  {destinoExcedentePendente === "credito_cliente"
                    ? "Guardando credito..."
                    : "Guardar como credito"}
                </div>
                <div className="mt-1 text-sm text-emerald-700">
                  O excedente entra no saldo da cliente para uso futuro.
                </div>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmarExcedenteOpen(false)}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(e) => onChange(moneyMask(e.target.value))}
        placeholder="R$ 0,00"
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-900"
      />
    </Field>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

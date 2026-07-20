"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CreditCard, Plus, Trash2, Wallet } from "lucide-react";
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

function getFormaPagamentoLabel(value?: string | null) {
  if (!value) return "Pagamento";

  const found = FORMAS_PAGAMENTO.find((item) => item.value === value);
  if (found) return found.label;

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getFormaPagamentoTone(value?: string | null) {
  if (value === "pix") return "sky";
  if (value === "dinheiro") return "emerald";
  if (value === "credito") return "violet";
  if (value === "debito") return "amber";
  if (value === "credito_cliente") return "rose";
  return "zinc";
}

function getFormaPagamentoCardClass(value?: string | null) {
  const tone = getFormaPagamentoTone(value);

  if (tone === "sky") return "border-sky-200 bg-sky-50/40";
  if (tone === "emerald") return "border-emerald-200 bg-emerald-50/40";
  if (tone === "violet") return "border-violet-200 bg-violet-50/40";
  if (tone === "amber") return "border-amber-200 bg-amber-50/40";
  if (tone === "rose") return "border-rose-200 bg-rose-50/40";

  return "border-zinc-200 bg-zinc-50";
}

function getParcelasLabel(parcelas?: number | null) {
  if (!parcelas || parcelas <= 1) return "A vista";
  return `${parcelas}x`;
}

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
};

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
  const valorLiquidoPrevisto = Math.max(
    repassaTaxaCliente ? valorBaseDigitado : valorBaseDigitado - taxaPreviewValor,
    0
  );

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
  const ctaLabel =
    faltaReceber > 0 && valorBaseDigitado >= faltaReceber
      ? "Fechar pagamento"
      : "Adicionar pagamento";

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
      <div className="space-y-3">
        <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-zinc-700" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Falta receber
                </div>
                <div className="text-lg font-bold text-zinc-900">
                  {faltaReceber > 0 ? formatCurrency(faltaReceber) : "Pagamento concluido"}
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <PreviewCard label="Pago" value={formatCurrency(totalPago)} compact />
              <PreviewCard label="Troco" value={formatCurrency(troco)} compact />
              <PreviewCard
                label="Credito"
                value={formatCurrency(creditoClienteDisponivel)}
                compact
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Atalhos
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-900">
              Preencher rapido
            </div>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                disabled={saving || faltaReceber <= 0}
                onClick={() =>
                  setValorPagamento(
                    faltaReceber.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  )
                }
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Receber restante
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  formaPagamento !== "credito_cliente" ||
                  creditoClienteDisponivel <= 0
                }
                onClick={() =>
                  setValorPagamento(
                    Math.min(creditoClienteDisponivel, Math.max(faltaReceber, 0)).toLocaleString(
                      "pt-BR",
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )
                  )
                }
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-left text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                Usar credito
              </button>
            </div>
          </div>
        </section>

        {podeEditar ? (
          <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Novo pagamento
                </div>
                <div className="mt-0.5 text-base font-bold text-zinc-900">
                  Lancar recebimento
                </div>
              </div>

              <PaymentChip
                label={getFormaPagamentoLabel(formaPagamento)}
                tone={getFormaPagamentoTone(formaPagamento)}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Forma de pagamento">
                <select
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
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
                    className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  />
                </Field>
              ) : null}

              <Field label="Observacao opcional">
                <input
                  value={observacaoPagamento}
                  onChange={(e) => setObservacaoPagamento(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                  placeholder="Pix, cartao, parcial..."
                />
              </Field>
            </div>

            {comandaSelecionada?.id_cliente ? (
              <div
                className={`mt-3 rounded-2xl border px-4 py-3 text-sm ${
                  creditoClienteDisponivel > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                {creditoClienteDisponivel > 0
                  ? `${clienteNome} tem ${formatCurrency(
                      creditoClienteDisponivel
                    )} em credito disponivel.`
                  : `${clienteNome} ainda nao tem credito disponivel.`}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Vincule uma cliente para usar ou guardar credito.
              </div>
            )}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <PreviewCard
                label="Cliente paga"
                value={formatCurrency(valorCobradoCliente)}
                compact
              />
              <PreviewCard
                label={repassaTaxaCliente ? "Taxa repassada" : "Liquido previsto"}
                value={
                  repassaTaxaCliente
                    ? formatCurrency(taxaPreviewValor)
                    : formatCurrency(valorLiquidoPrevisto)
                }
                compact
              />
            </div>

            <button
              type="button"
              onClick={handleAdicionarPagamento}
              disabled={saving || !comandaSelecionada || valorBaseDigitado <= 0}
              className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-emerald-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
            >
              <Plus size={19} />
              {saving ? "Processando pagamento..." : ctaLabel}
            </button>
          </section>
        ) : null}

        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Wallet size={16} className="text-zinc-600" />
            <div className="text-sm font-bold text-zinc-900">Pagamentos lancados</div>
          </div>

          <div className="space-y-2.5">
            {pagamentos.map((pagamento) => {
              const taxaPercentualItem = Number(
                pagamento.taxa_maquininha_percentual || 0
              );
              const taxaValorItem = Number(pagamento.taxa_maquininha_valor || 0);
              const valorLiquido = Number(pagamento.valor || 0) - taxaValorItem;

              return (
                <div
                  key={pagamento.id}
                  className={`rounded-2xl border-l-4 border p-3.5 ${getFormaPagamentoCardClass(
                    pagamento.forma_pagamento
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-zinc-900">
                          {getFormaPagamentoLabel(pagamento.forma_pagamento)}
                        </span>
                        <span className="text-sm font-medium text-zinc-700">
                          {formatCurrency(pagamento.valor)}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                          {getParcelasLabel(pagamento.parcelas)}
                        </span>
                      </div>

                      {(taxaPercentualItem > 0 || taxaValorItem > 0) ? (
                        <div className="mt-1 text-xs text-zinc-500">
                          Taxa {taxaPercentualItem.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          % • liquido {formatCurrency(valorLiquido)}
                        </div>
                      ) : null}

                      {Number(pagamento.valor_credito_cliente || 0) > 0 ? (
                        <div className="mt-1 text-xs font-medium text-sky-700">
                          Credito gerado:{" "}
                          {formatCurrency(Number(pagamento.valor_credito_cliente || 0))}
                        </div>
                      ) : null}

                      {Number(pagamento.valor_troco || 0) > 0 ? (
                        <div className="mt-1 text-xs font-medium text-emerald-700">
                          Troco: {formatCurrency(Number(pagamento.valor_troco || 0))}
                        </div>
                      ) : null}

                      {pagamento.observacoes ? (
                        <div className="mt-1 text-xs text-zinc-500">
                          Obs.: {pagamento.observacoes}
                        </div>
                      ) : null}

                      {pagamento.recebido_em || pagamento.created_at ? (
                        <div className="mt-1 text-xs text-zinc-400">
                          {formatShortDateTime(
                            pagamento.recebido_em || pagamento.created_at
                          )}
                        </div>
                      ) : null}
                    </div>

                    {podeEditar ? (
                      <button
                        type="button"
                        onClick={() => onRemoverPagamento(pagamento.id)}
                        className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        title="Remover pagamento"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {pagamentos.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-center text-sm text-zinc-500">
                Nenhum pagamento lancado ainda.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
          <InfoRow label="Total pago" value={formatCurrency(totalPago)} />
          <InfoRow label="Credito gerado" value={formatCurrency(totalCreditoGerado)} />
          <InfoRow label="Falta receber" value={formatCurrency(faltaReceber)} />
          <InfoRow label="Troco" value={formatCurrency(troco)} />
        </section>
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
              {formatCurrency(valorBaseDigitado)}. O excedente de{" "}
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
                  O caixa recebe o valor e o excedente continua como troco da venda.
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
                  O excedente entra no saldo da cliente para ela usar depois no caixa.
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
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
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
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
        placeholder="0,00"
      />
    </Field>
  );
}

function PreviewCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-zinc-50 ${
        compact ? "px-3 py-2.5" : "px-4 py-3"
      }`}
    >
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className={`mt-1 font-semibold text-zinc-900 ${compact ? "text-sm" : "text-base"}`}>
        {value}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function PaymentChip({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "emerald" | "rose" | "sky" | "violet" | "zinc";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "rose"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : tone === "sky"
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : tone === "violet"
              ? "border-violet-200 bg-violet-50 text-violet-700"
              : "border-zinc-200 bg-zinc-100 text-zinc-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${toneClass}`}
    >
      {label}
    </span>
  );
}

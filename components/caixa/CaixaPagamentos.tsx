"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CreditCard, Trash2, User2, Wallet } from "lucide-react";
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
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "transferencia", label: "Transferência" },
  { value: "boleto", label: "Boleto" },
  { value: "outro", label: "Outro" },
  { value: "credito_cliente", label: "Crédito da cliente" },
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
  showRulesCard?: boolean;
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
  showRulesCard = true,
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
  async function handleAdicionarPagamento() {
    if (saving || !comandaSelecionada || valorBaseDigitado <= 0) {
      return;
    }

    if (
      formaPagamento !== "credito_cliente" &&
      valorBaseDigitado > faltaReceber &&
      faltaReceber > 0 &&
      comandaSelecionada?.id_cliente
    ) {
      setConfirmarExcedenteOpen(true);
      return;
    }

    await onAdicionarPagamento();
  }

  async function handleConfirmarExcedente(
    destinoExcedente: "troco" | "credito_cliente"
  ) {
    if (saving) {
      return;
    }

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
      <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-zinc-700" />
            <div className="text-lg font-bold text-zinc-900">Pagamentos</div>
          </div>
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
                      <PaymentChip
                        label={getFormaPagamentoLabel(pagamento.forma_pagamento)}
                        tone={getFormaPagamentoTone(pagamento.forma_pagamento)}
                      />
                    </div>

                    <div className="mt-0.5 text-sm text-zinc-500">
                      {formatCurrency(pagamento.valor)}
                      {pagamento.parcelas > 1 ? ` - ${pagamento.parcelas}x` : ""}
                    </div>

                    {Number(pagamento.valor_credito_cliente || 0) > 0 ? (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        <Wallet size={12} />
                        Crédito gerado:{" "}
                        {formatCurrency(Number(pagamento.valor_credito_cliente || 0))}
                      </div>
                    ) : null}

                    {(taxaPercentualItem > 0 || taxaValorItem > 0) && (
                      <div className="mt-1.5 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="text-xs font-medium text-amber-800">
                          Taxa aplicada
                        </div>
                        <div className="text-xs text-amber-700">
                          Percentual:{" "}
                          {taxaPercentualItem.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          %
                        </div>
                        <div className="text-xs text-amber-700">
                          Valor taxa: {formatCurrency(taxaValorItem)}
                        </div>
                        <div className="text-xs text-amber-700">
                          Valor sem taxa: {formatCurrency(valorLiquido)}
                        </div>
                      </div>
                    )}

                    {pagamento.observacoes ? (
                      <div className="mt-1.5 text-xs text-zinc-500">
                        Obs.: {pagamento.observacoes}
                      </div>
                    ) : null}

                    {pagamento.recebido_em || pagamento.created_at ? (
                      <div className="mt-1.5 text-xs text-zinc-400">
                        Recebido em{" "}
                        {formatShortDateTime(pagamento.recebido_em || pagamento.created_at)}
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
              Nenhum pagamento lançado.
            </div>
          ) : null}
        </div>

        {podeEditar ? (
          <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PreviewCard
                label="Crédito disponível"
                value={formatCurrency(creditoClienteDisponivel)}
              />
              <PreviewCard
                label="Crédito gerado"
                value={formatCurrency(totalCreditoGerado)}
              />
            </div>

            {comandaSelecionada?.id_cliente ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  creditoClienteDisponivel > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                {creditoClienteDisponivel > 0
                  ? `${clienteNome} tem ${formatCurrency(
                      creditoClienteDisponivel
                    )} em crédito pronto para usar no pagamento.`
                  : `${clienteNome} ainda não tem crédito disponível.`}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Vincule uma cliente na comanda para guardar excedente como crédito ou usar saldo existente.
              </div>
            )}

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
              label="Valor base"
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

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <PreviewCard label="Valor base" value={formatCurrency(valorBaseDigitado)} />
              <PreviewCard
                label="Taxa automática"
                value={`${Number(taxaPercentualNumero || 0).toLocaleString(
                  "pt-BR",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}%`}
              />
              <PreviewCard
                label="Valor da taxa"
                value={formatCurrency(taxaPreviewValor)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PreviewCard
                label="Cliente paga"
                value={formatCurrency(valorCobradoCliente)}
              />
              <PreviewCard
                label="Líquido previsto"
                value={formatCurrency(valorLiquidoPrevisto)}
              />
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {repassaTaxaCliente
                ? "A taxa é somada ao valor cobrado do cliente."
                : "A taxa não é somada ao cliente."}
            </div>

            <Field label="Observação">
              <textarea
                rows={3}
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                placeholder="Ex.: cartão da cliente, pix recepção, pagamento parcial..."
              />
            </Field>

            <button
              type="button"
              onClick={handleAdicionarPagamento}
              disabled={saving || !comandaSelecionada || valorBaseDigitado <= 0}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Adicionando pagamento..." : "Adicionar pagamento"}
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-2.5 border-t border-zinc-200 pt-4">
          <InfoRow label="Total pago" value={formatCurrency(totalPago)} />
          <InfoRow label="Crédito gerado" value={formatCurrency(totalCreditoGerado)} />
          <InfoRow label="Falta receber" value={formatCurrency(faltaReceber)} />
          <InfoRow label="Troco" value={formatCurrency(troco)} />
        </div>
      </div>

      {showRulesCard ? (
        <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-zinc-800">
            <User2 size={16} />
            <div className="font-semibold">Fechamento</div>
          </div>

          <div className="space-y-2 text-sm leading-5 text-zinc-500">
            <p>O total dos pagamentos precisa bater com a comanda.</p>
            <p>Ao finalizar, o sistema baixa estoque, gera comissão e encerra vínculos.</p>
            <p>Agendamento sem comanda vira comanda automática ao abrir no caixa.</p>
          </div>
        </div>
      ) : null}

      {confirmarExcedenteOpen ? (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[540px] rounded-[28px] border border-white/20 bg-white p-6 shadow-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Excedente no pagamento
            </div>
            <h3 className="mt-2 text-xl font-bold text-zinc-900">
              A cliente está pagando mais do que falta
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Faltam {formatCurrency(faltaReceber)} e você está lançando{" "}
              {formatCurrency(valorBaseDigitado)}. O excedente de{" "}
              {formatCurrency(Math.max(valorBaseDigitado - faltaReceber, 0))} vai
              sair como troco ou ficar salvo como crédito para {clienteNome}.
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
                    ? "Lançando troco..."
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
                    ? "Guardando crédito..."
                    : "Guardar como crédito"}
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

function PreviewCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
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

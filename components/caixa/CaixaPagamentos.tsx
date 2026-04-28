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
  }) => void;
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
  function handleAdicionarPagamento() {
    if (
      formaPagamento !== "credito_cliente" &&
      valorBaseDigitado > faltaReceber &&
      faltaReceber > 0 &&
      comandaSelecionada?.id_cliente
    ) {
      setConfirmarExcedenteOpen(true);
      return;
    }

    onAdicionarPagamento();
  }

  return (
    <>
      <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-zinc-700" />
            <div className="text-lg font-bold text-zinc-900">Pagamentos</div>
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            Lance recebimentos e confira o impacto da taxa antes do fechamento.
          </div>
        </div>

        <div className="space-y-3">
          {pagamentos.map((pagamento) => {
            const taxaPercentualItem = Number(
              pagamento.taxa_maquininha_percentual || 0
            );
            const taxaValorItem = Number(pagamento.taxa_maquininha_valor || 0);
            const valorLiquido = Number(pagamento.valor || 0) - taxaValorItem;

            return (
              <div
                key={pagamento.id}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold capitalize text-zinc-900">
                      {pagamento.forma_pagamento}
                    </div>

                    <div className="mt-1 text-sm text-zinc-500">
                      {formatCurrency(pagamento.valor)}
                      {pagamento.parcelas > 1 ? ` - ${pagamento.parcelas}x` : ""}
                    </div>

                    {Number(pagamento.valor_credito_cliente || 0) > 0 ? (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                        <Wallet size={12} />
                        Credito gerado:{" "}
                        {formatCurrency(Number(pagamento.valor_credito_cliente || 0))}
                      </div>
                    ) : null}

                    {(taxaPercentualItem > 0 || taxaValorItem > 0) && (
                      <div className="mt-2 space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
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
                      <div className="mt-2 text-xs text-zinc-500">
                        Obs.: {pagamento.observacoes}
                      </div>
                    ) : null}

                    {pagamento.recebido_em || pagamento.created_at ? (
                      <div className="mt-2 text-xs text-zinc-400">
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
              Nenhum pagamento lancado.
            </div>
          ) : null}
        </div>

        {podeEditar ? (
          <div className="mt-5 space-y-4 border-t border-zinc-200 pt-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <PreviewCard
                label="Credito disponivel"
                value={formatCurrency(creditoClienteDisponivel)}
              />
              <PreviewCard
                label="Credito gerado nesta comanda"
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
                    )} em credito pronto para usar no pagamento.`
                  : `${clienteNome} ainda nao tem credito disponivel.`}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Vincule uma cliente na comanda para guardar excedente como credito ou usar saldo existente.
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
              <PreviewCard
                label="Valor base"
                value={formatCurrency(valorBaseDigitado)}
              />
              <PreviewCard
                label="Taxa automatica"
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
                label="Liquido previsto"
                value={formatCurrency(valorLiquidoPrevisto)}
              />
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
              {repassaTaxaCliente
                ? "A taxa e somada ao valor cobrado do cliente e o liquido previsto preserva a base da venda."
                : "A taxa nao e somada ao cliente. O liquido previsto mostra quanto sobra depois do custo da maquininha."}
            </div>

            <Field label="Observacao">
              <textarea
                rows={3}
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
                placeholder="Ex.: cartao da cliente, pix recepcao, pagamento parcial..."
              />
            </Field>

            <button
              type="button"
              onClick={handleAdicionarPagamento}
              disabled={saving || !comandaSelecionada}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              Adicionar pagamento
            </button>
          </div>
        ) : null}

        <div className="mt-5 space-y-3 border-t border-zinc-200 pt-5">
          <InfoRow label="Total pago" value={formatCurrency(totalPago)} />
          <InfoRow
            label="Credito gerado"
            value={formatCurrency(totalCreditoGerado)}
          />
          <InfoRow label="Falta receber" value={formatCurrency(faltaReceber)} />
          <InfoRow label="Troco" value={formatCurrency(troco)} />
        </div>
      </div>

      {showRulesCard ? (
        <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-zinc-800">
            <User2 size={16} />
            <div className="font-semibold">Regras do fechamento</div>
          </div>

          <div className="space-y-2 text-sm leading-6 text-zinc-500">
            <p>O total dos pagamentos precisa bater com o total da comanda.</p>
            <p>
              Ao finalizar, o sistema baixa estoque, gera comissao e encerra os
              agendamentos vinculados.
            </p>
            <p>Agendamento sem comanda vira comanda automatica ao abrir no caixa.</p>
            <p>
              A taxa da maquininha segue a configuracao do salao e o valor mostrado
              no painel de pagamento.
            </p>
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
                onClick={() => {
                  setConfirmarExcedenteOpen(false);
                  onAdicionarPagamento({ destinoExcedente: "troco" });
                }}
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-left transition hover:bg-zinc-50"
              >
                <div className="text-sm font-semibold text-zinc-900">
                  Dar troco
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  O caixa recebe o valor e o excedente continua como troco da venda.
                </div>
              </button>

              <button
                type="button"
                disabled={!comandaSelecionada?.id_cliente}
                onClick={() => {
                  setConfirmarExcedenteOpen(false);
                  onAdicionarPagamento({ destinoExcedente: "credito_cliente" });
                }}
                className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-emerald-900">
                  Guardar como credito
                </div>
                <div className="mt-1 text-sm text-emerald-700">
                  O excedente entra no saldo da cliente para ela usar depois no caixa.
                </div>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
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

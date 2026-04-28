"use client";

import type { ReactNode } from "react";
import { CreditCard, Trash2, User2 } from "lucide-react";
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
  faltaReceber: number;
  troco: number;
  saving: boolean;
  onAdicionarPagamento: () => void;
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
  faltaReceber,
  troco,
  saving,
  onAdicionarPagamento,
  onRemoverPagamento,
  showRulesCard = true,
}: Props) {
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
              onClick={onAdicionarPagamento}
              disabled={saving || !comandaSelecionada}
              className="w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              Adicionar pagamento
            </button>
          </div>
        ) : null}

        <div className="mt-5 space-y-3 border-t border-zinc-200 pt-5">
          <InfoRow label="Total pago" value={formatCurrency(totalPago)} />
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

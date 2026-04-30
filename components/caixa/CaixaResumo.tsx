"use client";

import { ReceiptText, Wallet } from "lucide-react";
import { ComandaDetalhe } from "./types";
import { formatCurrency, getStatusCaixaMeta, moneyMask } from "./utils";

type Props = {
  comandaSelecionada: ComandaDetalhe | null;
  descontoInput: string;
  acrescimoInput: string;
  setDescontoInput: (value: string) => void;
  setAcrescimoInput: (value: string) => void;
  onSalvar: () => void;
  saving: boolean;
};

export default function CaixaResumo({
  comandaSelecionada,
  descontoInput,
  acrescimoInput,
  setDescontoInput,
  setAcrescimoInput,
  onSalvar,
  saving,
}: Props) {
  const status = comandaSelecionada
    ? getStatusCaixaMeta(comandaSelecionada.status)
    : null;

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-zinc-700" />
            <div className="text-lg font-bold text-zinc-900">Resumo financeiro</div>
          </div>
        </div>

        {status ? (
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${status.badgeClass}`}
          >
            {status.label}
          </span>
        ) : null}
      </div>

      {!comandaSelecionada ? (
        <div className="rounded-[24px] border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
          <ReceiptText className="mx-auto mb-3 text-zinc-400" size={28} />
          <div className="text-sm font-semibold text-zinc-800">
            Selecione uma comanda para ver a totalização.
          </div>
          <div className="mt-1 text-sm text-zinc-500">
            O resumo financeiro aparece assim que uma venda entra em foco.
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <div className="rounded-[24px] bg-zinc-950 px-4 py-4 text-white">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">Total</div>
              <div className="mt-1 text-3xl font-bold">
                {formatCurrency(comandaSelecionada.total)}
              </div>
              <div className="mt-1.5 text-sm text-zinc-400">{status?.description}</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              <InfoCard label="Subtotal" value={formatCurrency(comandaSelecionada.subtotal)} />
              <InfoCard label="Desconto" value={formatCurrency(comandaSelecionada.desconto)} />
              <InfoCard label="Acréscimo" value={formatCurrency(comandaSelecionada.acrescimo)} />
            </div>
          </div>

          {comandaSelecionada.status !== "fechada" &&
          comandaSelecionada.status !== "cancelada" ? (
            <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
              <div className="text-sm font-semibold text-zinc-800">Ajustes da venda</div>
              <div className="grid grid-cols-2 gap-3">
                <MoneyField
                  label="Desconto"
                  value={descontoInput}
                  onChange={setDescontoInput}
                />
                <MoneyField
                  label="Acréscimo"
                  value={acrescimoInput}
                  onChange={setAcrescimoInput}
                />
              </div>

              <button
                type="button"
                onClick={onSalvar}
                disabled={saving}
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                Atualizar resumo
              </button>
            </div>
          ) : null}
        </>
      )}
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
    <div>
      <label className="mb-1 block text-sm font-semibold text-zinc-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(moneyMask(e.target.value))}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
        placeholder="0,00"
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

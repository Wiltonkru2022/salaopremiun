"use client";

import { Wallet } from "lucide-react";
import { ComandaDetalhe } from "./types";
import { formatCurrency, moneyMask } from "./utils";

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
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Wallet size={18} className="text-zinc-700" />
        <div className="text-lg font-bold text-zinc-900">Resumo financeiro</div>
      </div>

      <div className="space-y-3">
        <InfoRow label="Subtotal" value={formatCurrency(comandaSelecionada?.subtotal)} />
        <InfoRow label="Desconto" value={formatCurrency(comandaSelecionada?.desconto)} />
        <InfoRow label="Acréscimo" value={formatCurrency(comandaSelecionada?.acrescimo)} />

        <div className="rounded-2xl bg-zinc-900 px-4 py-4 text-white">
          <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">Total</div>
          <div className="mt-1 text-2xl font-bold">
            {formatCurrency(comandaSelecionada?.total)}
          </div>
        </div>
      </div>

      {comandaSelecionada &&
      comandaSelecionada.status !== "fechada" &&
      comandaSelecionada.status !== "cancelada" ? (
        <div className="mt-5 space-y-3 border-t border-zinc-200 pt-5">
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
      <label className="mb-1 block text-sm font-semibold text-zinc-700">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(moneyMask(e.target.value))}
        className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
        placeholder="0,00"
      />
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
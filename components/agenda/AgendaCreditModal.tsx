"use client";

import { Receipt, Wallet, X } from "lucide-react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";

type Props = {
  open: boolean;
  clienteId: string;
  valor: string;
  observacao: string;
  loading: boolean;
  clientesOptions: SearchableOption[];
  onClose: () => void;
  onClienteChange: (value: string) => void;
  onValorChange: (value: string) => void;
  onObservacaoChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  variant?: "modal" | "sidebar";
};

export default function AgendaCreditModal({
  open,
  clienteId,
  valor,
  observacao,
  loading,
  clientesOptions,
  onClose,
  onClienteChange,
  onValorChange,
  onObservacaoChange,
  onSubmit,
  variant = "modal",
}: Props) {
  if (!open) return null;

  const body = (
    <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Crédito da cliente
        </div>
        <h3 className="mt-1 text-lg font-bold text-zinc-900">
          Registrar crédito
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Lance um saldo para a cliente usar depois no caixa. Isso não cria venda nem comanda.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Wallet size={16} />
            Cliente para o crédito
          </div>
          <SearchableSelect
            placeholder="Digite o nome da cliente"
            emptyText="Nenhuma cliente encontrada."
            options={clientesOptions}
            value={clienteId}
            onChange={onClienteChange}
          />
        </div>

        <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Valor do crédito
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={(event) => onValorChange(event.target.value)}
            placeholder="Ex.: 50,00"
            className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>

        <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
          <label className="mb-2 block text-sm font-semibold text-zinc-900">
            Observacao
          </label>
          <textarea
            rows={3}
            value={observacao}
            onChange={(event) => onObservacaoChange(event.target.value)}
            placeholder="Ex.: crédito por retorno, ajuste autorizado, cortesia..."
            className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={loading || !clienteId || !valor.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
        >
          <Receipt size={15} />
          {loading ? "Registrando..." : "Registrar crédito"}
        </button>
      </div>
    </div>
  );

  if (variant === "sidebar") {
    return body;
  }

  return (
    <div className="fixed inset-0 z-[118] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-[540px] overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
        >
          <X size={16} />
        </button>
        {body}
      </div>
    </div>
  );
}

"use client";

import { Receipt, Wallet, X } from "lucide-react";
import SearchableSelect, {
  type SearchableOption,
} from "@/components/ui/SearchableSelect";

type Props = {
  open: boolean;
  clienteId: string;
  loading: boolean;
  clientesOptions: SearchableOption[];
  onClose: () => void;
  onClienteChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export default function AgendaCreditModal({
  open,
  clienteId,
  loading,
  clientesOptions,
  onClose,
  onClienteChange,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[118] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[540px] overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Credito da cliente
            </div>
            <h3 className="mt-1 text-lg font-bold text-zinc-900">
              Abrir credito no caixa
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Escolha a cliente e eu abro a comanda certa no caixa para voce continuar o lancamento.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-[20px] border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Wallet size={16} />
              Cliente para o credito
            </div>
            <SearchableSelect
              placeholder="Digite o nome da cliente"
              emptyText="Nenhuma cliente encontrada."
              options={clientesOptions}
              value={clienteId}
              onChange={onClienteChange}
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
            disabled={loading || !clienteId}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            <Receipt size={15} />
            {loading ? "Abrindo..." : "Abrir no caixa"}
          </button>
        </div>
      </div>
    </div>
  );
}

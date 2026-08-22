"use client";

import { Receipt, Wallet } from "lucide-react";
import AppModal from "@/components/ui/AppModal";
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

  const content = (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-zinc-900">
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

      <label className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900">
        Valor do credito
        <input
          type="text"
          inputMode="decimal"
          value={valor}
          onChange={(event) => onValorChange(event.target.value)}
          placeholder="Ex.: 50,00"
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-zinc-900"
        />
      </label>

      <label className="block rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-900">
        Observacao
        <textarea
          rows={3}
          value={observacao}
          onChange={(event) => onObservacaoChange(event.target.value)}
          placeholder="Ex.: credito por retorno, ajuste autorizado, cortesia..."
          className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none transition focus:border-zinc-900"
        />
      </label>
    </div>
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
      >
        Voltar
      </button>

      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={loading || !clienteId || !valor.trim()}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
      >
        <Receipt size={15} />
        {loading ? "Registrando..." : "Registrar credito"}
      </button>
    </>
  );

  if (variant === "sidebar") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">
          Credito da cliente
        </div>
        <h3 className="mt-1 text-lg font-black text-zinc-900">
          Registrar credito
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Lance um saldo para a cliente usar depois no caixa.
        </p>
        <div className="mt-4">{content}</div>
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {footer}
        </div>
      </div>
    );
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Registrar credito"
      description="Lance um saldo para a cliente usar depois no caixa. Isso nao cria venda nem comanda."
      eyebrow="Credito da cliente"
      maxWidthClassName="max-w-[540px]"
      zIndexClassName="z-[118]"
      closeDisabled={loading}
      closeOnBackdropClick={!loading}
      footer={footer}
    >
      {content}
    </AppModal>
  );
}

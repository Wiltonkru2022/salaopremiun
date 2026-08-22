"use client";

import AppModal from "@/components/ui/AppModal";
import { statusPtBR } from "@/core/i18n/pt-BR";
import type { ComandaResumo } from "./page-types";

type Props = {
  open: boolean;
  comandas: ComandaResumo[];
  loading: boolean;
  onSelect: (comanda: ComandaResumo) => void;
  onClose: () => void;
  onCreateNew: () => Promise<void>;
  variant?: "modal" | "sidebar";
};

export default function AgendaModalComandaDecision({
  open,
  comandas,
  loading,
  onSelect,
  onClose,
  onCreateNew,
  variant = "modal",
}: Props) {
  if (!open) return null;

  const content = (
    <>
      <div className="space-y-2">
        {comandas.map((comanda) => (
          <button
            key={comanda.id}
            type="button"
            onClick={() => onSelect(comanda)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left transition hover:bg-zinc-50"
          >
            <div>
              <div className="font-bold text-zinc-900">
                Comanda #{comanda.numero}
              </div>
              <div className="text-sm text-zinc-500">
                Status: {statusPtBR(comanda.status)}
              </div>
            </div>

            <span className="text-sm font-bold text-zinc-700">Usar</span>
          </button>
        ))}
      </div>
    </>
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 disabled:opacity-60"
      >
        Cancelar
      </button>

      <button
        type="button"
        onClick={() => void onCreateNew()}
        disabled={loading}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "Criando..." : "Nova comanda"}
      </button>
    </>
  );

  if (variant === "sidebar") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-black text-zinc-900">
          Cliente ja possui comanda aberta
        </h3>
        <p className="mt-1 text-sm text-zinc-500">
          Escolha uma comanda aberta ou crie uma nova.
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
      title="Cliente ja possui comanda aberta"
      description="Escolha uma comanda aberta ou crie uma nova."
      maxWidthClassName="max-w-lg"
      zIndexClassName="z-[9999]"
      closeDisabled={loading}
      closeOnBackdropClick={!loading}
      footer={footer}
    >
      {content}
    </AppModal>
  );
}

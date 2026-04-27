"use client";

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
    <div className="w-full rounded-[24px] bg-white p-5 shadow-2xl">
      <h3 className="text-base font-bold text-zinc-900">
        Cliente ja possui comanda aberta
      </h3>

      <p className="mt-2 text-sm text-zinc-500">
        Escolha uma comanda aberta ou crie uma nova.
      </p>

      <div className="mt-4 space-y-3">
        {comandas.map((comanda) => (
          <button
            key={comanda.id}
            type="button"
            onClick={() => onSelect(comanda)}
            className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 px-4 py-3 text-left transition hover:bg-zinc-50"
          >
            <div>
              <div className="font-semibold text-zinc-900">
                Comanda #{comanda.numero}
              </div>
              <div className="text-sm text-zinc-500">Status: {comanda.status}</div>
            </div>

            <span className="text-sm font-semibold text-zinc-700">Usar</span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-700"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={onCreateNew}
          disabled={loading}
          className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Criando..." : "Nova comanda"}
        </button>
      </div>
    </div>
  );

  if (variant === "sidebar") {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md">{content}</div>
    </div>
  );
}

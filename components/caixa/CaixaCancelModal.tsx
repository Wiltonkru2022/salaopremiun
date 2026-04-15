"use client";

import { useEffect, useMemo, useState } from "react";
import { MOTIVOS_CANCELAMENTO_PADRAO } from "./constants";

type Props = {
  open: boolean;
  comandaNumero?: number | null;
  saving: boolean;
  podeConfirmar: boolean;
  onClose: () => void;
  onConfirm: (motivoFinal: string | null) => void;
};

export default function CaixaCancelModal({
  open,
  comandaNumero,
  saving,
  podeConfirmar,
  onClose,
  onConfirm,
}: Props) {
  const [tipoMotivoCancelamento, setTipoMotivoCancelamento] = useState("");
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  useEffect(() => {
    if (!open) return;

    setTipoMotivoCancelamento("");
    setMotivoCancelamento("");
  }, [open]);

  const motivoFinal = useMemo(() => {
    const value = [tipoMotivoCancelamento, motivoCancelamento.trim()]
      .filter(Boolean)
      .join(" - ");

    return value || null;
  }, [tipoMotivoCancelamento, motivoCancelamento]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white shadow-2xl">
        <div className="border-b border-zinc-200 px-6 py-5">
          <h2 className="text-xl font-bold text-zinc-900">Cancelar comanda</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Informe o motivo do cancelamento da comanda
            {comandaNumero ? ` #${comandaNumero}` : ""}.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">
              Motivo padrao
            </label>

            <select
              value={tipoMotivoCancelamento}
              onChange={(e) => setTipoMotivoCancelamento(e.target.value)}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
            >
              <option value="">Selecione</option>
              {MOTIVOS_CANCELAMENTO_PADRAO.map((motivo) => (
                <option key={motivo} value={motivo}>
                  {motivo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">
              Observacao
            </label>

            <textarea
              rows={4}
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-zinc-900"
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={() => onConfirm(motivoFinal)}
            disabled={saving || !podeConfirmar}
            className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}

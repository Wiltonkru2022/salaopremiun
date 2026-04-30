"use client";

import { useEffect, useMemo, useState } from "react";
import AppModal from "@/components/ui/AppModal";
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
    <AppModal
      open={open}
      onClose={onClose}
      title="Cancelar comanda"
      description={`Informe o motivo do cancelamento da comanda${
        comandaNumero ? ` #${comandaNumero}` : ""
      }.`}
      maxWidthClassName="max-w-lg"
      zIndexClassName="z-[90]"
      closeDisabled={saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={() => onConfirm(motivoFinal)}
            disabled={saving || !podeConfirmar}
            className="rounded-2xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Motivo padrão
          </label>

          <select
            value={tipoMotivoCancelamento}
            onChange={(e) => setTipoMotivoCancelamento(e.target.value)}
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
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
            Observação
          </label>

          <textarea
            rows={4}
            value={motivoCancelamento}
            onChange={(e) => setMotivoCancelamento(e.target.value)}
            placeholder="Descreva o motivo do cancelamento..."
            className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-zinc-900"
          />
        </div>
      </div>
    </AppModal>
  );
}

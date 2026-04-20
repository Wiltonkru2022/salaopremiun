"use client";

import { Phone, UserRound, X } from "lucide-react";

type Props = {
  open: boolean;
  name: string;
  whatsapp: string;
  saving: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export default function AgendaQuickClientModal({
  open,
  name,
  whatsapp,
  saving,
  onClose,
  onNameChange,
  onWhatsappChange,
  onSubmit,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[115] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-white/20 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Cadastro rapido
            </div>
            <h3 className="mt-1 text-lg font-bold text-zinc-900">
              Nova cliente
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Cadastre em poucos segundos e continue o agendamento sem sair do fluxo.
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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              Nome da cliente
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3">
              <UserRound size={15} className="text-zinc-400" />
              <input
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="Ex.: Maria Silva"
                className="h-12 w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700">
              WhatsApp
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3">
              <Phone size={15} className="text-zinc-400" />
              <input
                value={whatsapp}
                onChange={(event) => onWhatsappChange(event.target.value)}
                placeholder="Ex.: (11) 99999-9999"
                className="h-12 w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </div>
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
            disabled={saving}
            className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

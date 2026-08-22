"use client";

import { Phone, UserRound } from "lucide-react";
import AppModal from "@/components/ui/AppModal";

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
    <AppModal
      open={open}
      onClose={onClose}
      title="Nova cliente"
      description="Cadastre em poucos segundos e continue o agendamento sem sair do fluxo."
      eyebrow="Cadastro rapido"
      maxWidthClassName="max-w-[480px]"
      zIndexClassName="z-[115]"
      closeDisabled={saving}
      closeOnBackdropClick={!saving}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar cliente"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
          Nome da cliente
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 transition focus-within:border-zinc-950 focus-within:bg-white">
            <UserRound size={15} className="text-zinc-400" />
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Ex.: Maria Silva"
              className="h-11 w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </label>

        <label className="block text-xs font-bold uppercase tracking-[0.12em] text-zinc-500">
          WhatsApp
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 transition focus-within:border-zinc-950 focus-within:bg-white">
            <Phone size={15} className="text-zinc-400" />
            <input
              value={whatsapp}
              onChange={(event) => onWhatsappChange(event.target.value)}
              placeholder="Ex.: (11) 99999-9999"
              className="h-11 w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
        </label>
      </div>
    </AppModal>
  );
}

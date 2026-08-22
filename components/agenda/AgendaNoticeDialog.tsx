"use client";

import AppModal from "@/components/ui/AppModal";
import type { AgendaPageNoticeState } from "./page-types";

type Props = {
  modal: AgendaPageNoticeState;
  onClose: () => void;
};

export default function AgendaNoticeDialog({ modal, onClose }: Props) {
  if (!modal.open) return null;

  const toneClasses =
    modal.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : modal.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <AppModal
      open={modal.open}
      onClose={onClose}
      title={modal.title}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-[520]"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
        >
          Entendi
        </button>
      }
    >
      <div className={`rounded-lg border px-4 py-4 ${toneClasses}`}>
        <div className="text-sm leading-6">{modal.message}</div>
      </div>
    </AppModal>
  );
}

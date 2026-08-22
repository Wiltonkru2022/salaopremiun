"use client";

import AppModal from "@/components/ui/AppModal";
import type { AvisoState } from "./useAgendaModal";

type Props = {
  aviso: AvisoState;
  onClose: () => void;
  variant?: "modal" | "sidebar";
};

export default function AgendaModalAviso({
  aviso,
  onClose,
  variant = "modal",
}: Props) {
  if (!aviso.open) return null;

  const avisoClasses =
    aviso.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : aviso.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : aviso.tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  const content = (
    <div className={`rounded-lg border px-4 py-4 ${avisoClasses}`}>
      <div className="text-base font-black">{aviso.title}</div>
      <div className="mt-2 text-sm leading-6">{aviso.message}</div>
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        {content}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white"
          >
            Entendi
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppModal
      open={aviso.open}
      onClose={onClose}
      title={aviso.title}
      maxWidthClassName="max-w-md"
      zIndexClassName="z-[140]"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-bold text-white"
        >
          Entendi
        </button>
      }
    >
      {content}
    </AppModal>
  );
}

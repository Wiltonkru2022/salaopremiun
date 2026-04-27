"use client";

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
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";

  const content = (
    <div className="w-full rounded-[24px] bg-white p-5 shadow-2xl">
      <div className={`rounded-2xl border px-4 py-4 ${avisoClasses}`}>
        <div className="text-base font-bold">{aviso.title}</div>
        <div className="mt-2 text-sm leading-6">{aviso.message}</div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Entendi
        </button>
      </div>
    </div>
  );

  if (variant === "sidebar") {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-md">{content}</div>
    </div>
  );
}

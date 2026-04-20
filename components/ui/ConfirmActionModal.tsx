"use client";

import AppModal from "@/components/ui/AppModal";

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  tone?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmActionModal({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  tone = "default",
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      maxWidthClassName="max-w-md"
      closeDisabled={loading}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              tone === "danger"
                ? "rounded-lg border border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                : "rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
            }
          >
            {loading ? "Processando..." : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-6 text-zinc-600">{description}</p>
    </AppModal>
  );
}

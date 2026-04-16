"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  zIndexClassName?: string;
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  showCloseButton?: boolean;
  closeDisabled?: boolean;
};

export default function AppModal({
  open,
  onClose,
  title,
  description,
  eyebrow,
  children,
  footer,
  maxWidthClassName = "max-w-2xl",
  zIndexClassName = "z-[100]",
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  showCloseButton = true,
  closeDisabled = false,
}: Props) {
  if (!open) return null;

  return (
    <div
      className={clsx(
        "fixed inset-0 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm",
        zIndexClassName,
        overlayClassName
      )}
    >
      <div
        className={clsx(
          "w-full overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl",
          maxWidthClassName,
          panelClassName
        )}
      >
        <div
          className={clsx(
            "border-b border-zinc-200 px-6 py-5",
            headerClassName
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {eyebrow}
                </div>
              ) : null}

              <h2 className="text-xl font-bold text-zinc-900">{title}</h2>

              {description ? (
                <p className="mt-1 text-sm text-zinc-500">{description}</p>
              ) : null}
            </div>

            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-60"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={clsx(
            "max-h-[calc(90vh-168px)] overflow-y-auto px-6 py-5",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={clsx(
              "flex flex-col-reverse gap-3 border-t border-zinc-200 px-6 py-5 sm:flex-row sm:justify-end",
              footerClassName
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

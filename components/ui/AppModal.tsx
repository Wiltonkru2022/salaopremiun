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
        "fixed inset-0 flex items-center justify-center overflow-y-auto bg-black/55 p-2 backdrop-blur-sm sm:p-4",
        zIndexClassName,
        overlayClassName
      )}
    >
      <div
        className={clsx(
          "my-auto flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-[28px]",
          maxWidthClassName,
          panelClassName
        )}
      >
        <div
          className={clsx(
            "shrink-0 border-b border-zinc-200 px-4 py-3.5 sm:px-6 sm:py-5",
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

              <h2 className="text-lg font-bold leading-tight text-zinc-900 sm:text-xl">
                {title}
              </h2>

              {description ? (
                <p className="mt-1 text-sm leading-5 text-zinc-500">
                  {description}
                </p>
              ) : null}
            </div>

            {showCloseButton ? (
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-800 disabled:opacity-60 sm:h-10 sm:w-10 sm:rounded-2xl"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            ) : null}
          </div>
        </div>

        <div
          className={clsx(
            "min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            className={clsx(
              "shrink-0 flex flex-col-reverse gap-3 border-t border-zinc-200 px-4 py-3.5 sm:flex-row sm:justify-end sm:px-6 sm:py-5",
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

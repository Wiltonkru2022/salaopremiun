"use client";

import { useEffect } from "react";
import clsx from "clsx";

type MenuAction = {
  label: string;
  tone?: "default" | "danger" | "warning";
  onClick: () => void;
};

type MenuSection = {
  title?: string;
  actions: MenuAction[];
};

type Props = {
  open: boolean;
  x: number;
  y: number;
  title: string;
  subtitle?: string;
  sections: MenuSection[];
  onClose: () => void;
};

export default function AgendaContextMenu({
  open,
  x,
  y,
  title,
  subtitle,
  sections,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        className="fixed inset-0 z-[205] cursor-default bg-transparent"
        aria-label="Fechar menu da agenda"
      />

      <div
        className="fixed z-[206] w-[min(92vw,320px)] overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
        style={{
          left: Math.max(12, Math.min(x, window.innerWidth - 340)),
          top: Math.max(12, Math.min(y, window.innerHeight - 420)),
        }}
      >
        <div className="border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-bold text-zinc-900">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
          ) : null}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.title || "section"}-${sectionIndex}`}
              className={clsx(sectionIndex > 0 && "mt-2 border-t border-zinc-100 pt-2")}
            >
              {section.title ? (
                <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  {section.title}
                </div>
              ) : null}

              <div className="space-y-1">
                {section.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={clsx(
                      "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
                      action.tone === "danger"
                        ? "text-rose-700 hover:bg-rose-50"
                        : action.tone === "warning"
                          ? "text-amber-700 hover:bg-amber-50"
                          : "text-zinc-700 hover:bg-zinc-50"
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

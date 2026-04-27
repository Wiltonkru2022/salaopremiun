"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

type MenuAction = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
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

type PositionState = {
  left: number;
  top: number;
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<PositionState>({
    left: 12,
    top: 12,
  });

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  useLayoutEffect(() => {
    if (!open || !menuRef.current || typeof window === "undefined") return;

    const menuWidth = menuRef.current.offsetWidth || 360;
    const menuHeight = menuRef.current.offsetHeight || 520;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;

    const nextLeft = Math.max(
      margin,
      Math.min(x, viewportWidth - menuWidth - margin)
    );
    const nextTop = Math.max(
      margin,
      Math.min(y, viewportHeight - menuHeight - margin)
    );

    setPosition({ left: nextLeft, top: nextTop });
  }, [open, sections, subtitle, title, x, y]);

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
        ref={menuRef}
        className="fixed z-[206] flex max-h-[calc(100vh-24px)] w-[min(94vw,380px)] flex-col overflow-hidden rounded-[22px] border border-zinc-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)]"
        style={{
          left: position.left,
          top: position.top,
        }}
      >
        <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Menu rapido
          </div>
          <div className="mt-1 text-sm font-bold text-zinc-900">{title}</div>
          {subtitle ? (
            <div className="mt-0.5 text-xs text-zinc-500">{subtitle}</div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
          {sections.map((section, sectionIndex) => (
            <div
              key={`${section.title || "section"}-${sectionIndex}`}
              className={clsx(sectionIndex > 0 && "mt-2.5")}
            >
              {section.title ? (
                <div className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                  {section.title}
                </div>
              ) : null}

              <div className="space-y-1 rounded-[18px] border border-zinc-200 bg-zinc-50/70 p-1.5">
                {section.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-[14px] px-3 py-2.5 text-left transition",
                      action.tone === "danger"
                        ? "text-rose-700 hover:bg-rose-50"
                        : action.tone === "warning"
                          ? "text-amber-700 hover:bg-amber-50"
                          : "text-zinc-700 hover:bg-white"
                    )}
                  >
                    {action.icon ? (
                      <div
                        className={clsx(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border",
                          action.tone === "danger"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : action.tone === "warning"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-zinc-200 bg-white text-zinc-700"
                        )}
                      >
                        <action.icon size={16} />
                      </div>
                    ) : null}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {action.label}
                        </span>
                        {action.badge ? (
                          <span className="shrink-0 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                            {action.badge}
                          </span>
                        ) : null}
                      </div>
                      {action.description ? (
                        <div className="mt-0.5 text-xs font-medium text-zinc-500">
                          {action.description}
                        </div>
                      ) : null}
                    </div>
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

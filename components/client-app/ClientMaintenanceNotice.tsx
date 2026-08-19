"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";

const SESSION_KEY = "salaopremiun-app-cliente-maintenance-dismissed";

export default function ClientMaintenanceNotice() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;

    setMounted(true);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function closeNotice() {
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    window.setTimeout(() => setMounted(false), 320);
  }

  if (!mounted) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-[140] px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] transition-all duration-500 ease-out ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-[130%] opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto mx-auto flex max-w-md items-start gap-3 rounded-[1.35rem] border border-amber-300/50 bg-zinc-950/95 p-4 text-white shadow-[0_18px_55px_rgba(0,0,0,0.42)] backdrop-blur-xl">
        <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400 text-zinc-950">
          <AlertTriangle size={20} strokeWidth={2.4} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-black tracking-[-0.02em] text-amber-300">
            Manutenção em andamento
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-zinc-100">
            Estamos em manutenção. Pode haver inconsistências no App Cliente. Aguarde até finalizarmos.
          </p>
        </div>

        <button
          type="button"
          onClick={closeNotice}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
          aria-label="Fechar aviso de manutenção"
          title="Fechar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

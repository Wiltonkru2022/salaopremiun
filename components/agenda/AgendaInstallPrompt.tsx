"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Download, MonitorSmartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "sp_agenda_install_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectDevice() {
  if (typeof navigator === "undefined") return "desktop";

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";

  return "desktop";
}

export default function AgendaInstallPrompt() {
  const [ready, setReady] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const device = useMemo(detectDevice, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    setReady(true);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  async function installNow() {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(DISMISS_KEY, "1");
      setReady(false);
    }

    setDeferredPrompt(null);
  }

  function close() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setReady(false);
  }

  if (!ready) return null;

  return (
    <div className="rounded-[18px] border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 px-3.5 py-2.5 shadow-[0_8px_18px_rgba(76,29,149,0.05)]">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-zinc-950 text-white">
          <CalendarDays size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-bold text-zinc-950">
              Instale a agenda
            </div>
            <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
              Mais foco
            </span>
          </div>
          <p className="mt-1 text-xs leading-4.5 text-zinc-600">
            {deferredPrompt
              ? "Seu navegador ja permite instalar a agenda agora."
              : device === "desktop"
                ? "Use o atalho do navegador e abra a agenda separada do resto do painel."
                : "Use Adicionar a tela inicial para voltar mais rapido para a agenda."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={installNow}
              className="inline-flex h-8.5 items-center gap-2 rounded-full bg-zinc-950 px-3.5 text-[11px] font-bold text-white transition hover:bg-zinc-800"
            >
              <Download size={14} />
              Instalar
            </button>
          ) : (
            <div className="inline-flex h-8.5 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 text-[11px] font-bold text-zinc-700">
              <MonitorSmartphone size={14} />
              Ver atalho
            </div>
          )}

          <button
            type="button"
            onClick={close}
            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Fechar dica de instalacao da agenda"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

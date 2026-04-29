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
    <div className="rounded-[20px] border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 px-4 py-3 shadow-[0_10px_24px_rgba(76,29,149,0.06)]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-zinc-950 text-white">
          <CalendarDays size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-bold text-zinc-950">
              Instale a agenda como app
            </div>
            <span className="rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-600">
              Menos abas e mais foco
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            {deferredPrompt
              ? "Seu navegador ja permite instalar a agenda agora."
              : device === "desktop"
                ? "Use o atalho de instalar do navegador e abra a agenda separada do resto do painel."
                : "Use Adicionar a tela inicial para voltar mais rapido para a agenda."}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={installNow}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-bold text-white transition hover:bg-zinc-800"
            >
              <Download size={14} />
              Instalar
            </button>
          ) : (
            <div className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700">
              <MonitorSmartphone size={14} />
              Ver atalho
            </div>
          )}

          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Fechar dica de instalacao da agenda"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

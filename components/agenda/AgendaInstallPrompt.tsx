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
    <div className="rounded-[24px] border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-sky-50 p-4 shadow-[0_16px_40px_rgba(76,29,149,0.08)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-zinc-950 text-white">
          <CalendarDays size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-zinc-950">
                Instale a agenda no computador
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Abra a agenda como app separado, sem misturar com outras abas do
                navegador.
              </p>
            </div>

            <button
              type="button"
              onClick={close}
              className="rounded-full border border-white/70 bg-white/90 p-1.5 text-zinc-500 shadow-sm"
              aria-label="Fechar dica de instalacao da agenda"
            >
              <X size={15} />
            </button>
          </div>

          <div className="mt-3 rounded-[18px] border border-white/80 bg-white/80 px-3 py-3 text-xs leading-5 text-zinc-600">
            {deferredPrompt
              ? "Seu navegador ja permite instalar esta agenda como aplicativo."
              : device === "desktop"
                ? "No Chrome ou Edge, use o icone de instalar na barra de endereco para deixar so a agenda no desktop."
                : "No celular, use Adicionar a tela inicial para abrir a agenda mais rapido."}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {deferredPrompt ? (
              <button
                type="button"
                onClick={installNow}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-bold text-white transition hover:bg-zinc-800"
              >
                <Download size={14} />
                Instalar agenda
              </button>
            ) : (
              <div className="inline-flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700">
                <MonitorSmartphone size={14} />
                Use o atalho Instalar app do navegador
              </div>
            )}

            <button
              type="button"
              onClick={close}
              className="h-10 rounded-full border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              Agora nao
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

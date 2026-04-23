"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "sp_app_profissional_install_dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectDevice() {
  if (typeof navigator === "undefined") return "android";

  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";

  return "desktop";
}

export default function ProfissionalInstallPrompt() {
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
    <div className="px-3 pt-3 sm:px-4">
      <div className="relative overflow-hidden rounded-[1.35rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-zinc-50 p-3 shadow-sm">
        <button
          type="button"
          onClick={close}
          className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-zinc-500 shadow-sm"
          aria-label="Fechar dica de instalacao"
        >
          <X size={15} />
        </button>

        <div className="flex gap-3 pr-7">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white">
            <Smartphone size={18} />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-bold text-zinc-950">
              Acesse mais rapido
            </div>
            <p className="mt-1 text-xs leading-5 text-zinc-600">
              Instale o app na tela inicial para abrir agenda e comandas sem
              procurar no navegador.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={installNow}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-bold text-white"
                >
                  <Download size={14} />
                  Instalar agora
                </button>
              ) : (
                <Link
                  href={`/app-profissional/instalar?device=${device}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-zinc-950 px-4 text-xs font-bold text-white"
                >
                  <Download size={14} />
                  Como instalar
                </Link>
              )}

              <button
                type="button"
                onClick={close}
                className="h-9 rounded-full border border-zinc-200 bg-white px-4 text-xs font-bold text-zinc-700"
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

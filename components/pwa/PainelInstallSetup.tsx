"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, LayoutDashboard, MonitorDown, WalletCards, X } from "lucide-react";
import { openPainelWorkspaceWindow } from "@/lib/painel/workspace-windows";
import InstallHelpDialog from "@/components/pwa/InstallHelpDialog";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_SETUP_DONE_KEY = "sp_painel_install_setup_done";

function isStandalone() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isDesktop() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 1024px)").matches;
}

export default function PainelInstallSetup() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const shouldForce = useMemo(
    () => searchParams.get("novo") === "1" || searchParams.get("boot") === "1",
    [searchParams]
  );

  useEffect(() => {
    if (!isDesktop()) return;

    const alreadyDone = window.localStorage.getItem(INSTALL_SETUP_DONE_KEY) === "1";
    setOpen(shouldForce || (!alreadyDone && !isStandalone()));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, [shouldForce]);

  async function installMainApp() {
    if (!deferredPrompt) {
      setHelpOpen(true);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "accepted") {
      window.localStorage.setItem(INSTALL_SETUP_DONE_KEY, "1");
    }

    setDeferredPrompt(null);
  }

  function close() {
    window.localStorage.setItem(INSTALL_SETUP_DONE_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <>
    <InstallHelpDialog
      area="o Painel principal"
      open={helpOpen}
      onClose={() => setHelpOpen(false)}
    />
    <div className="fixed inset-0 z-[420] flex items-center justify-center bg-zinc-950/45 px-4 py-6 backdrop-blur-sm">
      <section className="w-full max-w-4xl overflow-hidden rounded-[30px] border border-white/80 bg-white text-zinc-950 shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              <MonitorDown size={14} />
              Instalar no PC
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight">
              Instale o SalaoPremium para trabalhar mais rapido
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              O ideal e ter tres atalhos no computador: Painel principal,
              Agenda e Caixa. Cada area abre focada, sem bagunca de abas.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50"
            aria-label="Fechar instalacao"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-3">
          <InstallCard
            icon={<LayoutDashboard size={22} />}
            title="Painel principal"
            description="Dashboard, clientes, planos, configuracoes e gestao do salao."
            actionLabel={deferredPrompt ? "Instalar painel" : "Ver atalho"}
            onClick={installMainApp}
          />
          <InstallCard
            icon={<CalendarDays size={22} />}
            title="Agenda"
            description="Atalho dedicado para recepcao, horarios e atendimento."
            actionLabel="Abrir instalacao"
            onClick={() => openPainelWorkspaceWindow("/agenda?install=1")}
          />
          <InstallCard
            icon={<WalletCards size={22} />}
            title="Caixa"
            description="Atalho dedicado para comandas, recebimentos e fechamento."
            actionLabel="Abrir instalacao"
            onClick={() => openPainelWorkspaceWindow("/caixa?install=1")}
          />
        </div>

        <div className="border-t border-zinc-100 bg-zinc-50 px-5 py-3 text-xs leading-5 text-zinc-500">
          O navegador pode pedir uma instalacao por vez. Se algum botao abrir a
          area, use o aviso de instalacao que aparece no topo daquela pagina.
        </div>
      </section>
    </div>
    </>
  );
}

function InstallCard({
  actionLabel,
  description,
  icon,
  onClick,
  title,
}: {
  actionLabel: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mt-2 min-h-[54px] text-sm leading-6 text-zinc-600">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-bold text-white transition hover:bg-zinc-800"
      >
        {actionLabel}
      </button>
    </div>
  );
}

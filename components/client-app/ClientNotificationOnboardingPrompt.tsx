"use client";

import { BellRing, ShieldCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { requestClientPushPermission } from "@/components/push/requestClientPushPermission";

const STORAGE_KEY = "salaopremium:cliente:push-prompt:v1";

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function rememberChoice() {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // O app continua funcionando sem armazenamento local.
  }
}

export default function ClientNotificationOnboardingPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setVisible(false);
    if (
      pathname.startsWith("/app-cliente/onboarding") ||
      pathname.startsWith("/app-cliente/login") ||
      pathname.startsWith("/app-cliente/cadastro") ||
      pathname.startsWith("/app-cliente/recuperar-acesso")
    ) {
      return;
    }
    if (!isStandaloneApp()) return;
    if (!("Notification" in window) || Notification.permission !== "default") return;

    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => setVisible(true), 850);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    rememberChoice();
    setVisible(false);
  }

  async function enable() {
    setLoading(true);
    setMessage("");
    const result = await requestClientPushPermission().catch(() => "failed");

    if (result === "enabled") {
      rememberChoice();
      setVisible(false);
      setLoading(false);
      return;
    }

    if (result === "denied") {
      rememberChoice();
      setMessage("As notificações foram bloqueadas. Você pode liberar depois nas permissões do navegador.");
      setLoading(false);
      return;
    }

    setMessage("Não foi possível ativar agora. Você pode tentar novamente em Configurações.");
    setLoading(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-4 backdrop-blur-sm sm:items-center">
      <section className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white p-6 text-zinc-950 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-zinc-100 text-zinc-700"
          aria-label="Agora não"
        >
          <X size={20} />
        </button>

        <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-zinc-950 text-[#f5bd42] shadow-lg">
          <BellRing size={31} />
        </div>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">
          <ShieldCheck size={14} />
          Salão Premium Cliente
        </div>
        <h2 className="mt-4 text-3xl font-black leading-tight tracking-[-0.05em]">
          Receba seus avisos no celular
        </h2>
        <p className="mt-3 text-base font-semibold leading-7 text-zinc-500">
          Confirmações, reagendamentos e lembretes podem chegar mesmo quando o app estiver fechado.
        </p>
        <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          Ao tocar em ativar, o Android ou navegador mostrará a permissão oficial de notificações.
        </div>

        {message ? (
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold leading-6 text-zinc-700">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void enable()}
          disabled={loading}
          className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-base font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.2)] disabled:opacity-65"
        >
          <BellRing size={20} />
          {loading ? "Ativando..." : "Ativar notificações"}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 h-12 w-full text-sm font-black text-zinc-500"
        >
          Agora não
        </button>
      </section>
    </div>
  );
}

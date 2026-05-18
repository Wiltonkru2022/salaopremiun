"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import { Monitor, Smartphone } from "lucide-react";

type Props = {
  children: ReactNode;
};

function isMobileViewport() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(max-width: 1023px)").matches ||
    (window.matchMedia("(pointer: coarse)").matches &&
      window.screen.width < 1100)
  );
}

export default function PainelDesktopGuard({ children }: Props) {
  const [blocked, setBlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setBlocked(isMobileViewport());
      setReady(true);
    }

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  if (!ready) return null;

  if (!blocked) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-5 py-8 text-zinc-950">
      <section className="w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-zinc-950">
          <Image
            src="/favicon-preview.png"
            alt="SalãoPremium"
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-amber-800">
          <Smartphone size={14} />
          Celular detectado
        </div>

        <h1 className="mt-4 text-2xl font-black tracking-tight">
          Tudo pronto, mas o painel do salão e para computador
        </h1>

        <p className="mt-3 text-sm leading-6 text-zinc-600">
          Para proteger sua operação e evitar telas quebradas, o painel do
          salão abre apenas em PC ou notebook. Entre pelo navegador do
          computador para continuar.
        </p>

        <div className="mt-5 rounded-[22px] border border-zinc-200 bg-zinc-50 p-4 text-left">
          <div className="flex items-start gap-3">
            <Monitor className="mt-0.5 shrink-0 text-zinc-900" size={20} />
            <div>
              <div className="text-sm font-bold">Próximo passo</div>
              <p className="mt-1 text-xs leading-5 text-zinc-600">
                Abra este mesmo login no computador. Depois de entrar, o
                sistema mostra a instalação do Dashboard, Agenda e Caixa.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

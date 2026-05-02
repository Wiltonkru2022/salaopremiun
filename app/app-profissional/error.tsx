"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import ProfissionalHeader from "@/components/profissional/layout/ProfissionalHeader";

export default function AppProfissionalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[APP_PROFISSIONAL_ERROR_BOUNDARY]", {
      message: error?.message,
      digest: error?.digest,
    });
  }, [error]);

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#fff2c5_0,#f5f5f5_42%,#e7ecf2_100%)]">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-[#f5f5f5]/95 shadow-[0_0_80px_rgba(15,23,42,0.08)]">
        <ProfissionalHeader
          title="Area profissional"
          subtitle="Encontramos um problema ao abrir sua tela."
        />

        <main className="flex flex-1 items-start px-4 py-4">
          <div className="w-full rounded-[1.5rem] border border-red-200 bg-white p-4 shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </div>

            <h1 className="mt-3 text-[1.3rem] font-black tracking-[-0.03em] text-zinc-950">
              Nao foi possivel carregar esta tela
            </h1>

            <p className="mt-2.5 text-sm leading-6 text-zinc-600">
              Tente recarregar a tela. Se o problema vier de uma sessao antiga,
              entre novamente para limpar os dados salvos do navegador.
            </p>

            {error?.digest ? (
              <div className="mt-3 rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500">
                Codigo do erro: {error.digest}
              </div>
            ) : null}

            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-zinc-950 px-4 text-sm font-bold text-white"
              >
                <RefreshCcw size={16} />
                Tentar novamente
              </button>

              <Link
                href="/app-profissional/login?limpar=1"
                className="inline-flex h-11 w-full items-center justify-center rounded-[18px] border border-zinc-200 bg-zinc-50 px-4 text-sm font-bold text-zinc-800"
              >
                Entrar novamente
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

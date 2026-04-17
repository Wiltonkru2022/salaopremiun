"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/monitoring/client";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    void captureClientError({
      module: "app",
      action: "render_global_error_boundary",
      screen: "global_error",
      error,
      fallbackMessage: "Erro global inesperado.",
      details: {
        digest: error.digest || null,
      },
      useBeacon: true,
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#f7f5ef] text-zinc-950">
        <main className="flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-[36px] border border-red-200 bg-white p-8 shadow-sm">
            <div className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
              Falha global
            </div>
            <h1 className="mt-4 font-display text-4xl font-black">
              O SalaoPremium encontrou um erro inesperado
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
              O incidente foi capturado pela nova camada de monitoramento. Tente
              recarregar a aplicacao. Se a falha persistir, o Admin Master ja tera o
              contexto para diagnosticar.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white"
              >
                Recarregar
              </button>
              <a
                href="/"
                className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-800"
              >
                Ir para a home
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/monitoring/client";

export default function PainelError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    void captureClientError({
      module: "painel",
      action: "render_error_boundary",
      screen: "painel_error",
      error,
      fallbackMessage: "Erro inesperado no painel.",
      details: {
        digest: error.digest || null,
      },
      useBeacon: true,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl rounded-[30px] border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
      <div className="text-xs font-black uppercase tracking-[0.28em] text-red-500">
        Erro de execucao
      </div>
      <h2 className="mt-3 font-display text-3xl font-black">
        O painel encontrou uma falha inesperada
      </h2>
      <p className="mt-3 text-sm leading-6">
        O erro foi registrado para o Admin Master. Tente recarregar este trecho da
        aplicacao para continuar.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white"
        >
          Tentar novamente
        </button>
        <a
          href="/dashboard"
          className="rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700"
        >
          Voltar ao dashboard
        </a>
      </div>
    </div>
  );
}

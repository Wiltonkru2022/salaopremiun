"use client";

import { useEffect } from "react";
import { captureClientError } from "@/lib/monitoring/client";

export default function AdminMasterError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    void captureClientError({
      module: "admin_master",
      action: "render_error_boundary",
      screen: "admin_master_error",
      error,
      fallbackMessage: "Erro inesperado no AdminMaster.",
      details: {
        digest: error.digest || null,
      },
      useBeacon: true,
    });
  }, [error]);

  return (
    <div className="rounded-[30px] border border-red-200 bg-red-50 p-8 text-red-800 shadow-sm">
      <h2 className="font-display text-2xl font-black">Erro no AdminMaster</h2>
      <p className="mt-2 text-sm leading-6">
        O modulo abriu com falha e nao conseguiu concluir a renderizacao com
        seguranca. Tente novamente agora. Se esse erro voltar, acompanhe o
        alerta no painel de saude e nos logs internos.
      </p>
      {error.digest ? (
        <div className="mt-3 rounded-2xl border border-red-200 bg-white/60 px-4 py-3 text-xs font-semibold text-red-900">
          Digest tecnico: {error.digest}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="mt-5 rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white"
      >
        Tentar novamente
      </button>
    </div>
  );
}

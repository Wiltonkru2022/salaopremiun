"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCcw } from "lucide-react";
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
      details: { digest: error.digest || null },
      useBeacon: true,
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertTriangle size={21} />
      </div>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-zinc-950">Não foi possível abrir esta área</h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        A página encontrou uma falha ao carregar. Tente novamente; se o problema continuar, abra Saúde do sistema para verificar se existe um incidente ativo.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => unstable_retry()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-bold text-white hover:bg-zinc-800">
          <RefreshCcw size={16} /> Tentar novamente
        </button>
        <Link href="/admin-master/saude" className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
          Ver saúde do sistema
        </Link>
      </div>

      {error.digest ? (
        <details className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50">
          <summary className="cursor-pointer px-4 py-3 text-xs font-bold text-zinc-500">Detalhes técnicos</summary>
          <div className="border-t border-zinc-200 px-4 py-3 font-mono text-xs text-zinc-600">Digest: {error.digest}</div>
        </details>
      ) : null}
    </div>
  );
}

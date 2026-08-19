"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearClienteRestoreToken,
  readClienteRestoreToken,
  writeClienteRestoreToken,
} from "@/lib/client-app/restore-token.client";

export default function ClientSessionAutoRestore({
  next,
  clearOnLoad = false,
}: {
  next?: string | null;
  clearOnLoad?: boolean;
}) {
  const router = useRouter();
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (clearOnLoad) {
      clearClienteRestoreToken();
      return;
    }

    const restoreToken = readClienteRestoreToken();
    if (!restoreToken) return;

    let active = true;
    setRestoring(true);

    fetch("/api/app-cliente/session/refresh", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restoreToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          clearClienteRestoreToken();
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          restoreToken?: string;
        } | null;

        if (payload?.restoreToken) writeClienteRestoreToken(payload.restoreToken);

        router.replace(next || "/app-cliente/inicio");
        router.refresh();
      })
      .catch(() => {
        // Falha de rede nao apaga o token; uma nova tentativa pode funcionar depois.
      })
      .finally(() => {
        if (active) setRestoring(false);
      });

    return () => {
      active = false;
    };
  }, [clearOnLoad, next, router]);

  if (!restoring) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
      Restaurando seu acesso neste aparelho...
    </div>
  );
}

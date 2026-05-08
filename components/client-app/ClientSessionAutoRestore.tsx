"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const RESTORE_TOKEN_KEY = "salaopremium:cliente:restore-token";

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
      window.localStorage.removeItem(RESTORE_TOKEN_KEY);
      return;
    }

    const restoreToken = window.localStorage.getItem(RESTORE_TOKEN_KEY);
    if (!restoreToken) return;

    let active = true;
    setRestoring(true);

    fetch("/api/app-cliente/session/refresh", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ restoreToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          window.localStorage.removeItem(RESTORE_TOKEN_KEY);
          return;
        }

        const payload = (await response.json().catch(() => null)) as {
          restoreToken?: string;
        } | null;

        if (payload?.restoreToken) {
          window.localStorage.setItem(RESTORE_TOKEN_KEY, payload.restoreToken);
        }

        router.replace(next || "/app-cliente/agendamentos");
        router.refresh();
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

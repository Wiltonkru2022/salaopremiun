"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, BellRing } from "lucide-react";

type PushAudience = "cliente_app" | "profissional_app" | "salao_painel";

type PushStatus =
  | "checking"
  | "unsupported"
  | "unconfigured"
  | "ready"
  | "enabled"
  | "denied"
  | "saving";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function saveSubscription(audience: PushAudience, subscription: PushSubscription) {
  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      audience,
      subscription: subscription.toJSON(),
    }),
  });
}

export default function PushPermissionRuntime({
  audience,
  compact = false,
}: {
  audience: PushAudience;
  compact?: boolean;
}) {
  const [status, setStatus] = useState<PushStatus>("checking");
  const [publicKey, setPublicKey] = useState("");

  const label = useMemo(() => {
    if (status === "saving") return "Ativando...";
    if (status === "enabled") return "Avisos ativos";
    if (status === "denied") return "Avisos bloqueados";
    return "Ativar avisos";
  }, [status]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setStatus("unsupported");
        return;
      }

      const response = await fetch("/api/push/public-key", {
        credentials: "same-origin",
      }).catch(() => null);
      const payload = response ? await response.json().catch(() => null) : null;

      if (!active) return;

      if (!payload?.ok || !payload.publicKey) {
        setStatus("unconfigured");
        return;
      }

      setPublicKey(String(payload.publicKey));

      const permission = Notification.permission;
      if (permission === "denied") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => null);
      const subscription = await registration?.pushManager
        .getSubscription()
        .catch(() => null);

      if (subscription) {
        await saveSubscription(audience, subscription).catch(() => null);
      }

      if (!active) return;
      setStatus(subscription ? "enabled" : "ready");
    }

    load();
    return () => {
      active = false;
    };
  }, [audience]);

  async function handleEnable() {
    if (status !== "ready" || !publicKey) return;
    setStatus("saving");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "ready");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await saveSubscription(audience, subscription);

      if (!response.ok) {
        throw new Error("subscribe_failed");
      }

      setStatus("enabled");
    } catch {
      setStatus("ready");
    }
  }

  if (
    status === "checking" ||
    status === "unsupported" ||
    status === "unconfigured"
  ) {
    return null;
  }

  const enabled = status === "enabled";
  const denied = status === "denied";

  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={enabled || denied || status === "saving"}
      className={`inline-flex items-center justify-center gap-2 rounded-full border text-xs font-black transition disabled:cursor-default ${
        compact ? "h-9 px-3" : "h-10 px-4"
      } ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : denied
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-900 shadow-sm hover:border-zinc-300"
      }`}
      title={
        denied
          ? "Libere as notificacoes nas permissoes do navegador."
          : "Receber notificacoes na barra do celular."
      }
    >
      {enabled ? <BellRing size={15} /> : <Bell size={15} />}
      {label}
    </button>
  );
}

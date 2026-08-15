import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

type PushState = "checking" | "ready" | "enabled" | "denied" | "unsupported";

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob(`${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushPermissionButton() {
  const [state, setState] = useState<PushState>("checking");
  const [publicKey, setPublicKey] = useState("");

  useEffect(() => {
    let active = true;

    async function check() {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }

      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }

      const keyResponse = await fetch("/api/push/public-key", {
        credentials: "same-origin",
        cache: "no-store",
      }).catch(() => null);
      const keyPayload = keyResponse?.ok
        ? await keyResponse.json().catch(() => null)
        : null;
      const key = String(keyPayload?.publicKey || "");
      if (!key) {
        setState("unsupported");
        return;
      }

      const registration = await navigator.serviceWorker
        .register("/app-profissional/sw.js", { scope: "/app-profissional/" })
        .catch(() => null);
      const subscription = await registration?.pushManager
        .getSubscription()
        .catch(() => null);

      if (!active) return;
      setPublicKey(key);
      setState(subscription ? "enabled" : "ready");
    }

    void check();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    if (state !== "ready" || !publicKey) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState(permission === "denied" ? "denied" : "ready");
      return;
    }

    const registration = await navigator.serviceWorker.register(
      "/app-profissional/sw.js",
      { scope: "/app-profissional/" }
    );
    const subscription =
      (await registration.pushManager.getSubscription()) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(publicKey),
      }));

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "profissional_app",
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      setState("ready");
      throw new Error("Não foi possível registrar este celular para push.");
    }

    setState("enabled");
  }

  if (state === "checking" || state === "unsupported") return null;

  const enabled = state === "enabled";
  return (
    <button
      type="button"
      onClick={() => void enable()}
      disabled={enabled || state === "denied"}
      title={
        state === "denied"
          ? "Libere as notificações nas permissões do navegador."
          : enabled
            ? "Notificações ativadas"
            : "Ativar notificações neste celular"
      }
      className={`grid h-11 w-11 place-items-center rounded-full border ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : state === "denied"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-800"
      }`}
      aria-label={enabled ? "Notificações ativadas" : "Ativar notificações"}
    >
      {enabled ? <BellRing size={19} /> : <Bell size={19} />}
    </button>
  );
}

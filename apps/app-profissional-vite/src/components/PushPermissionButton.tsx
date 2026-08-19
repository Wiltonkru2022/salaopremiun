import { Bell, BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type PushState = "checking" | "ready" | "enabling" | "enabled" | "denied" | "unsupported";

function arrayBufferToBase64Url(value: ArrayBuffer | null) {
  if (!value) return "";
  const bytes = new Uint8Array(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob(`${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushPermissionButton() {
  const [state, setState] = useState<PushState>("checking");
  const [publicKey, setPublicKey] = useState("");
  const [error, setError] = useState("");

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
      let subscription = await registration?.pushManager
        .getSubscription()
        .catch(() => null);
      const subscriptionKey = arrayBufferToBase64Url(
        subscription?.options.applicationServerKey || null
      );

      if (!active) return;
      setPublicKey(key);
      if (
        subscription &&
        subscriptionKey &&
        subscriptionKey !== key &&
        Notification.permission === "granted"
      ) {
        await subscription.unsubscribe().catch(() => false);
        subscription = await registration?.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64ToBytes(key),
          })
          .catch(() => null);
      }

      if (subscription) {
        const saveResponse = await fetch("/api/push/subscribe", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience: "profissional_app",
            subscription: subscription.toJSON(),
          }),
        }).catch(() => null);

        if (!saveResponse?.ok) {
          setState("ready");
          return;
        }
      }

      setState(subscription ? "enabled" : "ready");
    }

    void check();
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    if (state !== "ready" || !publicKey) return;
    setState("enabling");
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "ready");
        return;
      }

      const registration = await navigator.serviceWorker.register(
        "/app-profissional/sw.js",
        { scope: "/app-profissional/" }
      );
      let subscription = await registration.pushManager.getSubscription();
      const subscriptionKey = arrayBufferToBase64Url(
        subscription?.options.applicationServerKey || null
      );

      if (subscription && subscriptionKey && subscriptionKey !== publicKey) {
        await subscription.unsubscribe().catch(() => false);
        subscription = null;
      }

      subscription =
        subscription ||
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
        throw new Error("Não foi possível registrar este celular para notificações.");
      }

      setState("enabled");
    } catch (enableError) {
      setError(enableError instanceof Error ? enableError.message : "Não foi possível ativar as notificações.");
      setState("ready");
    }
  }

  if (state === "checking" || state === "unsupported") return null;

  const enabled = state === "enabled";
  const enabling = state === "enabling";
  const title = error
    ? error
    : state === "denied"
      ? "Libere as notificações nas permissões do navegador."
      : enabled
        ? "Notificações ativadas"
        : enabling
          ? "Ativando notificações..."
          : "Ativar notificações neste celular";

  return (
    <button
      type="button"
      onClick={() => void enable()}
      disabled={enabled || enabling || state === "denied"}
      title={title}
      className={`grid h-11 w-11 place-items-center rounded-full border ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : error || state === "denied"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-800"
      }`}
      aria-label={title}
    >
      {enabling ? <Loader2 size={19} className="animate-spin" /> : enabled ? <BellRing size={19} /> : <Bell size={19} />}
    </button>
  );
}

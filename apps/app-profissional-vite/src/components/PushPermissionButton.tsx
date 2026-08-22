import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

export type ProfessionalPushState =
  | "checking"
  | "ready"
  | "saving"
  | "enabled"
  | "denied"
  | "unsupported";

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
  const raw = window.atob(
    `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  );
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function loadPublicKey() {
  const keyResponse = await fetch("/api/push/public-key", {
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => null);
  const keyPayload = keyResponse?.ok
    ? await keyResponse.json().catch(() => null)
    : null;
  return String(keyPayload?.publicKey || "").trim();
}

async function saveProfessionalSubscription(subscription: PushSubscription) {
  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: "profissional_app",
      subscription: subscription.toJSON(),
    }),
  }).catch(() => null);

  return Boolean(response?.ok);
}

async function resolveProfessionalPushState(
  requestPermission: boolean
): Promise<ProfessionalPushState> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  if (Notification.permission === "denied") return "denied";

  const publicKey = await loadPublicKey();
  if (!publicKey) return "unsupported";

  let permission = Notification.permission;
  if (requestPermission && permission === "default") {
    permission = await Notification.requestPermission().catch(
      () => "default" as NotificationPermission
    );
  }

  if (permission === "denied") return "denied";
  if (permission !== "granted") return "ready";

  try {
    const registration = await navigator.serviceWorker.register(
      "/app-profissional/sw.js",
      { scope: "/app-profissional/" }
    );
    await registration.update().catch(() => undefined);

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

    const saved = await saveProfessionalSubscription(subscription);
    return saved ? "enabled" : "ready";
  } catch {
    return "ready";
  }
}

export async function requestProfessionalPushPermission() {
  return resolveProfessionalPushState(true);
}

export function PushPermissionButton({ expanded = false }: { expanded?: boolean }) {
  const [state, setState] = useState<ProfessionalPushState>("checking");

  useEffect(() => {
    let active = true;
    void resolveProfessionalPushState(false).then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, []);

  async function enable() {
    if (state !== "ready") return;
    setState("saving");
    const next = await requestProfessionalPushPermission();
    setState(next);
  }

  if (state === "checking" || state === "unsupported") {
    return expanded ? (
      <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-500">
        Notificações não disponíveis neste navegador.
      </div>
    ) : null;
  }

  const enabled = state === "enabled";
  const denied = state === "denied";
  const saving = state === "saving";
  const label = enabled
    ? "Notificações ativadas"
    : denied
      ? "Bloqueadas no navegador"
      : saving
        ? "Ativando..."
        : "Ativar notificações";

  return (
    <button
      type="button"
      onClick={() => void enable()}
      disabled={enabled || denied || saving}
      title={
        denied
          ? "Libere as notificações nas permissões do navegador."
          : enabled
            ? "Notificações ativadas neste celular"
            : "Ativar notificações neste celular"
      }
      className={`${
        expanded
          ? "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black"
          : "grid h-11 w-11 place-items-center rounded-full"
      } border transition disabled:cursor-default ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : denied
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-800 shadow-sm"
      }`}
      aria-label={label}
    >
      {enabled ? <BellRing size={19} /> : <Bell size={19} />}
      {expanded ? <span>{label}</span> : null}
    </button>
  );
}

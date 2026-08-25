import { Capacitor } from "@capacitor/core";
import { Bell, BellRing } from "lucide-react";
import { useEffect, useState } from "react";

export type ProfessionalPushState =
  | "checking"
  | "ready"
  | "saving"
  | "enabled"
  | "denied"
  | "unsupported";

const NATIVE_NOTIFICATION_CHANNEL_ID = "salaopremiun_default";

function getSafeInternalUrl(value: unknown) {
  const url = String(value || "").trim();
  return url.startsWith("/") && !url.startsWith("//") ? url : "";
}

function isNativeLocalNotificationsAvailable() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable("LocalNotifications")
  );
}

function getNotificationId() {
  return Math.max(1, Math.floor(Date.now() % 2147483000));
}

async function showForegroundNativeNotification(notification: {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  if (!isNativeLocalNotificationsAvailable()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const title = String(notification.title || "SalaoPremiun").trim();
  const body = String(notification.body || "Voce tem uma nova notificacao.").trim();
  const url = getSafeInternalUrl(notification.data?.url);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: getNotificationId(),
        title,
        body,
        largeBody: body,
        channelId: NATIVE_NOTIFICATION_CHANNEL_ID,
        foreground: true,
        autoCancel: true,
        extra: { url },
        isExactNotification: false,
      },
    ],
  }).catch(() => undefined);
}

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

function isNativePushAvailable() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable("PushNotifications")
  );
}

export function isNativeProfessionalApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

async function saveProfessionalNativeToken(token: string) {
  const response = await fetch("/api/push/native/register", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      audience: "profissional_app",
      token,
      platform: Capacitor.getPlatform(),
      appId: "br.com.salaopremiun.profissional",
    }),
  }).catch(() => null);

  return Boolean(response?.ok);
}

async function resolveProfessionalNativePushState(
  requestPermission: boolean
): Promise<ProfessionalPushState | null> {
  if (!isNativePushAvailable()) return null;

  const { PushNotifications } = await import("@capacitor/push-notifications");
  let permissions = await PushNotifications.checkPermissions().catch(() => ({
    receive: "prompt" as const,
  }));

  if (requestPermission && permissions.receive === "prompt") {
    permissions = await PushNotifications.requestPermissions().catch(
      () => permissions
    );
  }

  if (permissions.receive === "denied") return "denied";
  if (permissions.receive !== "granted") return "ready";

  return new Promise<ProfessionalPushState>((resolve) => {
    let settled = false;
    let handles: Array<{ remove: () => Promise<void> }> = [];

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      handles.forEach((handle) => {
        void handle.remove().catch(() => undefined);
      });
      handles = [];
    };

    const done = (next: ProfessionalPushState) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(next);
    };

    const timeoutId = window.setTimeout(() => done("ready"), 12000);

    const registrationHandle = PushNotifications.addListener(
      "registration",
      (token) => {
        void saveProfessionalNativeToken(token.value).then((saved) => {
          done(saved ? "enabled" : "ready");
        });
      }
    );
    const errorHandle = PushNotifications.addListener("registrationError", () => {
      done("ready");
    });

    void Promise.all([registrationHandle, errorHandle])
      .then((nextHandles) => {
        handles = nextHandles;
        if (settled) {
          cleanup();
          return;
        }
        void PushNotifications.register().catch(() => done("ready"));
      })
      .catch(() => done("ready"));
  });
}

async function resolveProfessionalPushState(
  requestPermission: boolean
): Promise<ProfessionalPushState> {
  const nativeState = await resolveProfessionalNativePushState(requestPermission);
  if (nativeState) return nativeState;

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

  let permission: NotificationPermission = Notification.permission;
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
    if (!isNativePushAvailable()) return undefined;

    let active = true;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    void Promise.all([
      import("@capacitor/push-notifications"),
      import("@capacitor/local-notifications"),
    ])
      .then(([{ PushNotifications }, { LocalNotifications }]) => {
        if (!active) return;

        void PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            void showForegroundNativeNotification({
              title: notification.title,
              body: notification.body,
              data: notification.data as Record<string, unknown> | undefined,
            });
          }
        )
          .then((handle) => {
            if (active) handles.push(handle);
            else void handle.remove().catch(() => undefined);
          })
          .catch(() => undefined);

        void PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const url = getSafeInternalUrl(event.notification.data?.url);
            if (url) window.location.assign(url);
          }
        )
          .then((handle) => {
            if (active) handles.push(handle);
            else void handle.remove().catch(() => undefined);
          })
          .catch(() => undefined);

        void LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (event) => {
            const url = getSafeInternalUrl(event.notification.extra?.url);
            if (url) window.location.assign(url);
          }
        )
          .then((handle) => {
            if (active) handles.push(handle);
            else void handle.remove().catch(() => undefined);
          })
          .catch(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      handles.forEach((handle) => {
        void handle.remove().catch(() => undefined);
      });
    };
  }, []);

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

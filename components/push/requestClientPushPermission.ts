export type ClientPushPermissionResult =
  | "enabled"
  | "denied"
  | "unsupported"
  | "unconfigured"
  | "failed";

function base64ToBytes(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob(
    `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/")
  );
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
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

export async function requestClientPushPermission(): Promise<ClientPushPermissionResult> {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    return "unsupported";
  }

  if (Notification.permission === "denied") return "denied";

  const keyResponse = await fetch("/api/push/public-key", {
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => null);
  const keyPayload = keyResponse?.ok
    ? await keyResponse.json().catch(() => null)
    : null;
  const publicKey = String(keyPayload?.publicKey || "").trim();
  if (!publicKey) return "unconfigured";

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission().catch(() => "default" as NotificationPermission);

  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "failed";
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    await registration.update().catch(() => undefined);
    const readyRegistration = await navigator.serviceWorker.ready.catch(
      () => registration
    );

    let subscription = await readyRegistration.pushManager.getSubscription();
    const currentKey = arrayBufferToBase64Url(
      subscription?.options.applicationServerKey || null
    );

    if (subscription && currentKey && currentKey !== publicKey) {
      await subscription.unsubscribe().catch(() => false);
      subscription = null;
    }

    subscription =
      subscription ||
      (await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(publicKey),
      }));

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audience: "cliente_app",
        subscription: subscription.toJSON(),
      }),
    });

    return response.ok ? "enabled" : "failed";
  } catch {
    return "failed";
  }
}

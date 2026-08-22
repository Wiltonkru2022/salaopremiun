"use client";

import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
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

const SUBSCRIPTION_SAVE_TTL_MS = 12 * 60 * 60 * 1000;
const NATIVE_TOKEN_SAVE_TTL_MS = 12 * 60 * 60 * 1000;
const NATIVE_NOTIFICATION_CHANNEL_ID = "salaopremiun_default";

type ListenerHandle = {
  remove: () => Promise<void>;
};

function isNativePushRuntime() {
  try {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.isPluginAvailable("PushNotifications")
    );
  } catch {
    return false;
  }
}

function isNativeLocalNotificationsRuntime() {
  try {
    return (
      Capacitor.isNativePlatform() &&
      Capacitor.isPluginAvailable("LocalNotifications")
    );
  } catch {
    return false;
  }
}

function getNotificationId() {
  return Math.max(1, Math.floor(Date.now() % 2147483000));
}

async function showForegroundNativeNotification(notification: {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  if (!isNativeLocalNotificationsRuntime()) return;

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

function getNativeTokenCacheKey(audience: PushAudience, token: string) {
  return `salaopremium:native-push-token:${audience}:${token}`;
}

function wasNativeTokenSavedRecently(audience: PushAudience, token: string) {
  try {
    const value = window.localStorage.getItem(getNativeTokenCacheKey(audience, token));
    const lastSavedAt = Number(value || "0");
    return Number.isFinite(lastSavedAt) && Date.now() - lastSavedAt < NATIVE_TOKEN_SAVE_TTL_MS;
  } catch {
    return false;
  }
}

function markNativeTokenSaved(audience: PushAudience, token: string) {
  try {
    window.localStorage.setItem(getNativeTokenCacheKey(audience, token), String(Date.now()));
  } catch {
    // Cache local e apenas uma economia de chamadas.
  }
}

function getSafeInternalUrl(value: unknown) {
  const url = String(value || "").trim();
  return url.startsWith("/") && !url.startsWith("//") ? url : "";
}

async function saveNativeToken(audience: PushAudience, token: string) {
  if (wasNativeTokenSavedRecently(audience, token)) {
    return new Response(JSON.stringify({ ok: true, cached: true }), { status: 200 });
  }

  return fetch("/api/push/native/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      audience,
      token,
      platform: Capacitor.getPlatform(),
    }),
  }).then((response) => {
    if (response.ok) markNativeTokenSaved(audience, token);
    return response;
  });
}

async function registerNativePushToken(audience: PushAudience) {
  let registrationHandle: ListenerHandle | null = null;
  let errorHandle: ListenerHandle | null = null;
  let timeoutId = 0;

  try {
    let resolveToken: ((token: string) => void) | null = null;
    let rejectToken: ((error: unknown) => void) | null = null;
    const tokenPromise = new Promise<string>((resolve, reject) => {
      resolveToken = resolve;
      rejectToken = reject;
      timeoutId = window.setTimeout(() => reject(new Error("native_push_timeout")), 15000);
    });

    registrationHandle = await PushNotifications.addListener(
      "registration",
      (registration) => {
        window.clearTimeout(timeoutId);
        resolveToken?.(registration.value);
      }
    );

    errorHandle = await PushNotifications.addListener(
      "registrationError",
      (error) => {
        window.clearTimeout(timeoutId);
        rejectToken?.(error);
      }
    );

    await PushNotifications.register();
    const token = await tokenPromise;

    const response = await saveNativeToken(audience, token);
    if (!response.ok) throw new Error("native_push_save_failed");
  } finally {
    window.clearTimeout(timeoutId);
    await registrationHandle?.remove().catch(() => undefined);
    await errorHandle?.remove().catch(() => undefined);
  }
}

function getSubscriptionCacheKey(
  audience: PushAudience,
  subscription: PushSubscription,
  publicKey: string
) {
  return `salaopremium:push-subscription:${audience}:${publicKey}:${subscription.endpoint}`;
}

function getVapidKeyCacheKey(audience: PushAudience) {
  return `salaopremium:push-vapid-key:${audience}`;
}

function getSavedVapidKey(audience: PushAudience) {
  try {
    return window.localStorage.getItem(getVapidKeyCacheKey(audience)) || "";
  } catch {
    return "";
  }
}

function markVapidKeySaved(audience: PushAudience, publicKey: string) {
  try {
    window.localStorage.setItem(getVapidKeyCacheKey(audience), publicKey);
  } catch {
    // A marcacao local e apenas uma protecao contra rotacoes repetidas.
  }
}

function wasSubscriptionSavedRecently(
  audience: PushAudience,
  subscription: PushSubscription,
  publicKey: string
) {
  try {
    const value = window.localStorage.getItem(
      getSubscriptionCacheKey(audience, subscription, publicKey)
    );
    const lastSavedAt = Number(value || "0");
    return Number.isFinite(lastSavedAt) && Date.now() - lastSavedAt < SUBSCRIPTION_SAVE_TTL_MS;
  } catch {
    return false;
  }
}

function markSubscriptionSaved(
  audience: PushAudience,
  subscription: PushSubscription,
  publicKey: string
) {
  try {
    window.localStorage.setItem(
      getSubscriptionCacheKey(audience, subscription, publicKey),
      String(Date.now())
    );
  } catch {
    // Cache local e apenas uma economia de chamadas.
  }
}

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

function arrayBufferToUrlBase64(value: ArrayBuffer | null) {
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

async function saveSubscription(
  audience: PushAudience,
  subscription: PushSubscription,
  publicKey: string
) {
  if (wasSubscriptionSavedRecently(audience, subscription, publicKey)) {
    markVapidKeySaved(audience, publicKey);
    return new Response(JSON.stringify({ ok: true, cached: true }), { status: 200 });
  }

  return fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      audience,
      subscription: subscription.toJSON(),
    }),
  }).then((response) => {
    if (response.ok) {
      markSubscriptionSaved(audience, subscription, publicKey);
      markVapidKeySaved(audience, publicKey);
    }
    return response;
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
    if (status === "enabled") return "Notificações";
    if (status === "denied") return "Bloqueado";
    return "Ativar";
  }, [status]);

  useEffect(() => {
    let active = true;
    const nativeHandles: ListenerHandle[] = [];

    async function load() {
      if (isNativePushRuntime()) {
        const actionHandle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event) => {
            const url = getSafeInternalUrl(event.notification.data?.url);
            if (url) window.location.assign(url);
          }
        ).catch(() => null);

        if (actionHandle) nativeHandles.push(actionHandle);

        const receivedHandle = await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            void showForegroundNativeNotification({
              title: notification.title,
              body: notification.body,
              data: notification.data as Record<string, unknown> | undefined,
            });
          }
        ).catch(() => null);

        if (receivedHandle) nativeHandles.push(receivedHandle);

        const localActionHandle = await LocalNotifications.addListener(
          "localNotificationActionPerformed",
          (event) => {
            const url = getSafeInternalUrl(event.notification.extra?.url);
            if (url) window.location.assign(url);
          }
        ).catch(() => null);

        if (localActionHandle) nativeHandles.push(localActionHandle);

        const permissions = await PushNotifications.checkPermissions().catch(() => null);
        if (!active) return;

        if (permissions?.receive === "denied") {
          setStatus("denied");
          return;
        }

        if (permissions?.receive === "granted") {
          setStatus("saving");
          await registerNativePushToken(audience)
            .then(() => {
              if (active) setStatus("enabled");
            })
            .catch(() => {
              if (active) setStatus("ready");
            });
          return;
        }

        setStatus("ready");
        return;
      }

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
      if (!registration) {
        setStatus("ready");
        return;
      }

      await registration.update().catch(() => undefined);
      const readyRegistration = await navigator.serviceWorker.ready.catch(
        () => registration
      );
      let subscription = await readyRegistration.pushManager
        .getSubscription()
        .catch(() => null);

      const subscriptionKey = arrayBufferToUrlBase64(
        subscription?.options.applicationServerKey || null
      );
      const savedVapidKey = getSavedVapidKey(audience);

      if (
        registration &&
        subscription &&
        permission === "granted" &&
        (
          savedVapidKey !== String(payload.publicKey) ||
          (subscriptionKey && subscriptionKey !== String(payload.publicKey))
        )
      ) {
        await subscription.unsubscribe().catch(() => false);
        subscription = null;

        subscription = await readyRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(String(payload.publicKey)),
        });
      }

      if (subscription) {
        await saveSubscription(audience, subscription, String(payload.publicKey)).catch(
          () => null
        );
      }

      if (!active) return;
      setStatus(subscription ? "enabled" : "ready");
    }

    load();
    return () => {
      active = false;
      nativeHandles.forEach((handle) => {
        handle.remove().catch(() => undefined);
      });
    };
  }, [audience]);

  async function handleEnable() {
    if (status !== "ready") return;
    setStatus("saving");

    try {
      if (isNativePushRuntime()) {
        const permissions = await PushNotifications.requestPermissions();
        if (permissions.receive !== "granted") {
          setStatus(permissions.receive === "denied" ? "denied" : "ready");
          return;
        }

        await registerNativePushToken(audience);
        setStatus("enabled");
        return;
      }

      if (!publicKey) {
        setStatus("ready");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "ready");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await registration.update().catch(() => undefined);
      const readyRegistration = await navigator.serviceWorker.ready.catch(
        () => registration
      );
      let subscription = await readyRegistration.pushManager.getSubscription();
      const savedVapidKey = getSavedVapidKey(audience);
      const subscriptionKey = arrayBufferToUrlBase64(
        subscription?.options.applicationServerKey || null
      );

      if (
        subscription &&
        (
          savedVapidKey !== publicKey ||
          (subscriptionKey && subscriptionKey !== publicKey)
        )
      ) {
        await subscription.unsubscribe().catch(() => false);
        subscription = null;
      }

      subscription =
        subscription ||
        (await readyRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const response = await saveSubscription(audience, subscription, publicKey);

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
      className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-full border text-xs font-black transition disabled:cursor-default ${
        compact ? "h-9 w-9 px-0 sm:w-auto sm:px-3" : "h-10 px-4"
      } ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : denied
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-zinc-200 bg-white text-zinc-900 shadow-sm hover:border-zinc-300"
      }`}
      title={
        denied
          ? "Libere as notificações nas permissões do navegador."
          : "Receber notificações na barra do celular."
      }
    >
      {enabled ? <BellRing size={15} /> : <Bell size={15} />}
      <span className={compact ? "hidden whitespace-nowrap sm:inline" : "whitespace-nowrap"}>
        {label}
      </span>
    </button>
  );
}

/// <reference lib="webworker" />

import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string | null }>;
};

type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
};

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// JS e CSS do app sao versionados pelo precache do Workbox. Nao use CacheFirst
// nesses arquivos, pois isso pode manter um bundle antigo ativo depois do deploy.
registerRoute(
  ({ request }) => ["image", "font"].includes(request.destination),
  new CacheFirst({
    cacheName: "salaopremiun-static-media-v2",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  })
);

registerRoute(
  ({ url }) =>
    url.pathname.includes("/rest/v1/") ||
    url.pathname.includes("/auth/v1/user"),
  new NetworkFirst({
    cacheName: "salaopremiun-supabase-api",
    networkTimeoutSeconds: 4,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 120,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  })
);

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Remove o cache antigo que podia conter JS/CSS de releases anteriores.
      caches.delete("salaopremiun-assets"),
    ])
  );
});

self.addEventListener("push", (event) => {
  const fallback: PushPayload = {
    title: "SalaoPremium",
    body: "Voce tem uma nova atualizacao.",
    url: "/app-profissional/",
  };

  let payload = fallback;
  try {
    payload = event.data
      ? { ...fallback, ...event.data.json() }
      : fallback;
  } catch {
    payload = fallback;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || fallback.title, {
      body: payload.body || fallback.body,
      icon: "/app-profissional/icons/icon-192.png",
      badge: "/app-profissional/icons/icon-192.png",
      tag: payload.tag || "salaopremium-profissional-update",
      renotify: payload.renotify === true,
      requireInteraction: payload.requireInteraction === true,
      silent: payload.silent === true,
      timestamp: Number(payload.timestamp || Date.now()),
      data: { url: payload.url || fallback.url },
    } as NotificationOptions)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/app-profissional/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(
      (clientList) => {
        const existing = clientList.find(
          (client) => "focus" in client && client.url === targetUrl
        );

        if (existing) return existing.focus();
        return self.clients.openWindow(targetUrl);
      }
    )
  );
});

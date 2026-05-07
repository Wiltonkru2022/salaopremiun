self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "SalaoPremium",
    body: "Voce tem uma nova atualizacao.",
    url: "/",
  };

  let payload = fallback;
  try {
    payload = event.data ? { ...fallback, ...event.data.json() } : fallback;
  } catch {
    payload = fallback;
  }

  const asBoolean = (value) => value === true || value === "true";

  event.waitUntil(
    self.registration.showNotification(payload.title || fallback.title, {
      body: payload.body || fallback.body,
      icon: "/favicon-preview.png",
      badge: "/favicon-preview.png",
      tag: payload.tag || "salaopremium-update",
      renotify: asBoolean(payload.renotify),
      requireInteraction: asBoolean(payload.requireInteraction),
      silent: asBoolean(payload.silent),
      timestamp: Number(payload.timestamp || Date.now()),
      data: {
        url: payload.url || fallback.url,
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const focusedClient = clientList.find(
          (client) => "focus" in client && client.url === targetUrl
        );

        if (focusedClient) {
          return focusedClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});

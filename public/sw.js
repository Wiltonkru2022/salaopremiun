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

  event.waitUntil(
    self.registration.showNotification(payload.title || fallback.title, {
      body: payload.body || fallback.body,
      icon: "/app-profissional-icon.svg",
      badge: "/app-profissional-icon.svg",
      tag: payload.tag || "salaopremium-update",
      renotify: true,
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

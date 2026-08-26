import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Sistema Salão Premiun",
        short_name: "Salão Premiun",
        description: "Painel do salão com agenda, caixa, clientes, serviços e relatórios.",
        theme_color: "#050505",
        background_color: "#f6f6f4",
        display: "standalone",
        lang: "pt-BR",
        orientation: "any",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => ["script", "style", "image", "font"].includes(request.destination),
            handler: "CacheFirst",
            options: {
              cacheName: "sistema-salao-assets",
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              (url.pathname.startsWith("/api/painel/") || url.pathname === "/api/painel/session"),
            handler: "NetworkFirst",
            options: {
              cacheName: "sistema-salao-api",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 180, maxAgeSeconds: 60 * 15 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5181 },
});

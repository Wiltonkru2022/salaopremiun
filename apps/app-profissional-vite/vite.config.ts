import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://example.supabase.co";
  const supabaseHost = new URL(supabaseUrl).origin;

  return {
    base: "/app-profissional/",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "Salão Premiun",
          short_name: "Salão Premiun",
          description: "Agenda, clientes, serviços e comandas para profissional de salão.",
          theme_color: "#050505",
          background_color: "#f5f5f4",
          display: "standalone",
          lang: "pt-BR",
          orientation: "portrait",
          start_url: "/app-profissional/",
          scope: "/app-profissional/",
          icons: [
            {
              src: "/app-profissional/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: "/app-profissional/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === "script" || request.destination === "style" || request.destination === "image" || request.destination === "font",
              handler: "CacheFirst",
              options: {
                cacheName: "salaopremiun-assets",
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            },
            {
              urlPattern: ({ url }) => url.origin === supabaseHost && (url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/user")),
              handler: "NetworkFirst",
              options: {
                cacheName: "salaopremiun-supabase-api",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 }
              }
            }
          ]
        }
      })
    ],
    server: {
      port: 5177
    }
  };
});

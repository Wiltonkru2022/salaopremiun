import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = env.VITE_SUPABASE_URL || "https://example.supabase.co";
  const supabaseHost = new URL(supabaseUrl).origin;

  return {
    base: "/",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "Sistema Salão Premiun",
          short_name: "Salão Premiun",
          description: "Painel do salão em Vite com agenda, caixa, clientes, serviços e relatórios.",
          theme_color: "#050505",
          background_color: "#f6f6f4",
          display: "standalone",
          lang: "pt-BR",
          orientation: "any",
          start_url: "/",
          scope: "/",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              urlPattern: ({ request }) =>
                ["script", "style", "image", "font"].includes(request.destination),
              handler: "CacheFirst",
              options: {
                cacheName: "sistema-salao-assets",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            },
            {
              urlPattern: ({ url }) =>
                url.origin === supabaseHost &&
                (url.pathname.includes("/rest/v1/") || url.pathname.includes("/auth/v1/")),
              handler: "NetworkFirst",
              options: {
                cacheName: "sistema-salao-supabase",
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 180, maxAgeSeconds: 60 * 60 * 24 }
              }
            }
          ]
        }
      })
    ],
    server: {
      port: 5181
    }
  };
});

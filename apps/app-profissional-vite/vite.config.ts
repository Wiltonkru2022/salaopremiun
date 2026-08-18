import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "/app-profissional/",
    build: {
      // A aplicacao e publicada pelo projeto Next/Vercel a partir de /public.
      // Gerar diretamente aqui evita servir bundles antigos commitados.
      outDir: "../../public/app-profissional",
      emptyOutDir: true,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
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
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        },
      })
    ],
    server: {
      port: 5177,
      proxy: {
        "/api": {
          target: env.VITE_NEXT_APP_ORIGIN || "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    }
  };
});

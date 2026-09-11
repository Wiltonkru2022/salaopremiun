import { defineConfig, loadEnv } from "vite";
import { existsSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const nativeAndroid = mode === "android";
  const nativePushConfigured =
    nativeAndroid &&
    existsSync("../mobile-shells/profissional/android/app/google-services.json");

  return {
    // O Android abre os arquivos locais em https://localhost. A versão web
    // continua publicada abaixo de /app-profissional/.
    base: nativeAndroid ? "./" : "/app-profissional/",
    define: {
      "import.meta.env.VITE_NATIVE_PUSH_CONFIGURED": JSON.stringify(
        nativePushConfigured ? "true" : "false"
      ),
    },
    build: {
      // A aplicacao e publicada pelo projeto Next/Vercel a partir de /public.
      // Gerar diretamente aqui evita servir bundles antigos commitados.
      outDir: nativeAndroid
        ? "../mobile-shells/profissional/www"
        : "../../public/app-profissional",
      emptyOutDir: true,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
          includeAssets: ["brand-logo-profissional-v2.png", "icons/icon-192.png", "icons/icon-512.png"],
        manifest: {
          name: "Salão Premiun",
          short_name: "Salão Premiun",
          description: "Agenda, clientes, serviços e comandas para profissional de salão.",
          theme_color: "#050505",
          background_color: "#f5f5f4",
          display: "standalone",
          lang: "pt-BR",
          orientation: "portrait",
          start_url: nativeAndroid ? "." : "/app-profissional/",
          scope: nativeAndroid ? "." : "/app-profissional/",
          icons: [
            {
              src: nativeAndroid ? "icons/icon-192.png" : "/app-profissional/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable"
            },
            {
              src: nativeAndroid ? "icons/icon-512.png" : "/app-profissional/icons/icon-512.png",
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

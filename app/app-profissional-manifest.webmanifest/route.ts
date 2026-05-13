import { APP_VERSION } from "@/lib/app-version";

export async function GET() {
  const manifest = {
    id: "/app-profissional",
    name: "Salão Premium Profissional",
    short_name: "Salão Premium",
    description: "Agenda, clientes e comandas para profissionais do salão.",
    version: APP_VERSION,
    start_url: "/app-profissional/inicio",
    scope: "/app-profissional",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon-preview.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function GET() {
  const manifest = {
    id: "/app-profissional",
    name: "SalaoPremium Profissional",
    short_name: "SalaoPro",
    description: "Agenda, clientes e comandas para profissionais do salao.",
    start_url: "/app-profissional",
    scope: "/app-profissional",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      {
        src: "/app-profissional-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
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

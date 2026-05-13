export async function GET() {
  const manifest = {
    id: "/app-profissional",
    name: "SalaoPremium",
    short_name: "SalaoPremium",
    description: "Agenda, clientes e comandas para profissionais do salao.",
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

export async function GET() {
  const manifest = {
    id: "/agenda",
    name: "Agenda SalaoPremium",
    short_name: "Agenda",
    description: "Agenda focada para atendimento rapido do salao.",
    start_url: "/agenda",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6d28d9",
    orientation: "landscape",
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

export async function GET() {
  const manifest = {
    id: "/caixa",
    name: "Caixa SalaoPremium",
    short_name: "Caixa",
    description: "Caixa focado para comandas, recebimentos e fechamento do salao.",
    start_url: "/caixa",
    scope: "/caixa",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#09090b",
    orientation: "landscape",
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

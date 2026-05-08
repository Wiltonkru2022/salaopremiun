import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "SalaoPremium",
    short_name: "SalaoPremium",
    description: "Gestao premium para saloes com agenda, caixa, comandas e financeiro.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#09090b",
    orientation: "any",
    icons: [
      {
        src: "/favicon-preview.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

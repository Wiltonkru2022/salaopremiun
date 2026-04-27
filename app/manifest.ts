import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SalaoPremium",
    short_name: "SalaoPremium",
    description: "Gestao premium para saloes com agenda, caixa, comandas e financeiro.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#09090b",
    orientation: "any",
    icons: [
      {
        src: "/app-profissional-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

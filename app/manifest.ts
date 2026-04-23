import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SalaoPremium Profissional",
    short_name: "SalaoPro",
    description: "Agenda, clientes e comandas para profissionais do salao.",
    start_url: "/app-profissional",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#09090b",
    orientation: "portrait",
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

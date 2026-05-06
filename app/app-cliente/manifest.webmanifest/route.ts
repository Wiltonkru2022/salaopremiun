import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    id: "/app-cliente",
    name: "SalaoPremium",
    short_name: "SalaoPremium",
    description:
      "Agende horarios, acompanhe visitas e avalie seu atendimento pelo app cliente do SalaoPremium.",
    start_url: "/app-cliente/inicio",
    scope: "/app-cliente",
    display: "standalone",
    background_color: "#f7f7f5",
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
  });
}

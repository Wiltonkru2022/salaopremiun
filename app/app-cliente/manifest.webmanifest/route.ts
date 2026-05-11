import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    id: "/app-cliente",
    name: "Salão Premium",
    short_name: "Salão Premium",
    description:
      "Agende horários, acompanhe visitas e avalie seu atendimento pelo app cliente do Salão Premium.",
    start_url: "/app-cliente",
    scope: "/app-cliente",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#09090b",
    orientation: "portrait",
    icons: [
      {
        src: "/favicon-preview.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  });
}

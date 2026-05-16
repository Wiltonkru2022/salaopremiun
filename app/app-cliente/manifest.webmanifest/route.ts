import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/app-version";

export function GET() {
  return NextResponse.json({
    id: "/app-cliente",
    name: "Salão Premium",
    short_name: "Salão Premium",
    description:
      "Agende horários, acompanhe visitas e avalie seu atendimento pelo app cliente do Salão Premium.",
    version: APP_VERSION,
    start_url: "/app-cliente",
    scope: "/",
    display: "standalone",
    launch_handler: {
      client_mode: ["navigate-existing", "auto"],
    },
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

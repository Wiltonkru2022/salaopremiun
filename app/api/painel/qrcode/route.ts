import QRCode from "qrcode";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const text = String(url.searchParams.get("text") || "").trim();

  if (!text || text.length > 500) {
    return NextResponse.json(
      { error: "Informe um texto valido para gerar o QR Code." },
      { status: 400 }
    );
  }

  const svg = await QRCode.toString(text, {
    type: "svg",
    margin: 2,
    width: 360,
    color: {
      dark: "#18181b",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "Content-Disposition": "inline; filename=qrcode-salaopremiun.svg",
    },
  });
}

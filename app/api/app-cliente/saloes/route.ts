import { NextResponse } from "next/server";
import { listClientAppSaloesByLocation } from "@/lib/client-app/discovery-location";

// Rota publica somente leitura usada para listar saloes publicados por localidade.

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cidade = String(url.searchParams.get("cidade") || "").trim();
  const estado = String(url.searchParams.get("estado") || "").trim();

  if (!cidade || !estado) {
    return NextResponse.json({ message: "Informe estado e cidade." }, { status: 400 });
  }

  const saloes = await listClientAppSaloesByLocation({ cidade, estado, limit: 50 });
  return NextResponse.json({ saloes });
}

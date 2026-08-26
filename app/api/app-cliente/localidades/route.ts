import { NextResponse } from "next/server";
import { listClientAppLocations } from "@/lib/client-app/discovery-location";

// Rota publica somente leitura usada na descoberta de saloes do app cliente.

export async function GET() {
  const localidades = await listClientAppLocations();
  return NextResponse.json({ localidades });
}

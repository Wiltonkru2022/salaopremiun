import { NextResponse } from "next/server";
import { listClientAppLocations } from "@/lib/client-app/discovery-location";

export async function GET() {
  const localidades = await listClientAppLocations();
  return NextResponse.json({ localidades });
}

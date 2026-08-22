import { NextResponse } from "next/server";
import { getPublicStatusSnapshot } from "@/lib/monitoring/public-status.server";

export const dynamic = "force-dynamic";

// publicRoute: status operacional publico sem dados de cliente ou salao.
export async function GET() {
  try {
    const snapshot = await getPublicStatusSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        overall: {
          state: "unknown",
          label: "Estado desconhecido",
          detail: "O monitoramento está temporariamente indisponível; isso não significa que os serviços estejam operacionais.",
        },
        groups: [],
        incidents: [],
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

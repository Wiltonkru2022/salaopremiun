import { NextResponse } from "next/server";
import { getPlanosSaasCatalogo } from "@/lib/plans/catalog-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const planos = await getPlanosSaasCatalogo();

  return NextResponse.json({
    ok: true,
    planos: planos.filter((plano) => plano.ativo !== false),
  });
}


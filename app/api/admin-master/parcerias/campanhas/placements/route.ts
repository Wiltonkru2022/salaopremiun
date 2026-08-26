import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getDatabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getAdminMasterAccess("comunicacao_ver");
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  const database = getDatabaseAdmin() as any;
  const { data, error } = await database
    .from("parceria_campanhas")
    .select("id, locais_exibicao")
    .order("criado_em", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Não foi possível carregar os locais de exibição." },
      { status: 500 }
    );
  }

  const placements = Object.fromEntries(
    (data || [])
      .filter((row: any) => row?.id)
      .map((row: any) => [
        String(row.id),
        Array.isArray(row.locais_exibicao)
          ? row.locais_exibicao.map(String)
          : [],
      ])
  );

  return NextResponse.json({ ok: true, placements });
}

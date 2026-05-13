import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { queueOracleVpsCleanup } from "@/lib/oracle-vps/client";

export async function POST() {
  const access = await getAdminMasterAccess("operacao_reprocessar");

  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  try {
    const result = await queueOracleVpsCleanup({
      requestedBy: access.usuario.id,
      requestedFrom: "admin_master_saude",
    });

    return NextResponse.json({ ok: true, result }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Falha ao limpar logs antigos na VPS.",
      },
      { status: 502 }
    );
  }
}

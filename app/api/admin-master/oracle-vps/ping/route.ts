import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { sendOracleVpsPing } from "@/lib/oracle-vps/client";

export async function POST() {
  const access = await getAdminMasterAccess("operacao_reprocessar");

  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  const result = await sendOracleVpsPing({
    adminMasterUserId: access.usuario.id,
    action: "admin_master_oracle_vps_ping",
  });

  return NextResponse.json(result, {
    status: result.ok ? 202 : result.configured ? 502 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

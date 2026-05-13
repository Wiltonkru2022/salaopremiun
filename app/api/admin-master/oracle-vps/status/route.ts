import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getOracleVpsStatus } from "@/lib/oracle-vps/client";

export async function GET() {
  const access = await getAdminMasterAccess("operacao_ver");

  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.message },
      { status: access.status }
    );
  }

  const status = await getOracleVpsStatus();

  return NextResponse.json(status, {
    status: status.ok ? 200 : status.configured ? 502 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

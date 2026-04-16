import { NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminMasterPlanosSection } from "@/lib/admin-master/data";

export async function GET() {
  await requireAdminMasterUser("produto_ver");
  const data = await getAdminMasterPlanosSection();
  return NextResponse.json({ ok: true, data });
}

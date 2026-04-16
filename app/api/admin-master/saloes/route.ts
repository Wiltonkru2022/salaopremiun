import { NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminMasterSaloes } from "@/lib/admin-master/data";

export async function GET() {
  await requireAdminMasterUser("saloes_ver");
  const data = await getAdminMasterSaloes();
  return NextResponse.json({ ok: true, data });
}

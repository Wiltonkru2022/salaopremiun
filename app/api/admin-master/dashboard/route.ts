import { NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { getAdminMasterDashboard } from "@/lib/admin-master/data";

export async function GET() {
  await requireAdminMasterUser("dashboard_ver");
  const data = await getAdminMasterDashboard();
  return NextResponse.json({ ok: true, data });
}

import { NextResponse } from "next/server";
import { getAdminMasterAccess } from "@/lib/admin-master/auth/requireAdminMasterUser";
import {
  ADMIN_MASTER_HOME_PATH,
  sanitizeAdminMasterNextPath,
} from "@/lib/admin-master/auth/login-path";

export async function GET(request: Request) {
  const access = await getAdminMasterAccess("dashboard_ver");

  if (!access.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: access.message,
      },
      {
        status: access.status,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const requestUrl = new URL(request.url);
  const redirectTo =
    sanitizeAdminMasterNextPath(requestUrl.searchParams.get("next")) ||
    ADMIN_MASTER_HOME_PATH;

  return NextResponse.json(
    {
      ok: true,
      redirectTo,
      usuario: {
        id: access.usuario.id,
        nome: access.usuario.nome,
        perfil: access.usuario.perfil,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

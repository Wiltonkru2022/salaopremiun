import { NextResponse } from "next/server";
import { createClient } from "@/lib/db/server";
import { resolveAdminMasterAccessForIdentity } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { setAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { emitSecurityEvent } from "@/lib/security/security-events";

function getRequestHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0] ||
    request.headers.get("host")
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (assuranceError || assurance.currentLevel !== "aal2") {
    return NextResponse.json(
      { ok: false, message: "Confirme o codigo do autenticador para continuar." },
      { status: 403 }
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.id || !user.email) {
    return NextResponse.json(
      { ok: false, message: "Sessao expirada. Entre novamente." },
      { status: 401 }
    );
  }

  const access = await resolveAdminMasterAccessForIdentity(
    {
      id: user.id,
      email: user.email,
      nome: String(user.user_metadata?.nome || ""),
    },
    "dashboard_ver"
  );

  if (!access.ok) {
    return NextResponse.json(
      { ok: false, message: access.message },
      { status: access.status }
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      redirectTo: "/admin-master",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );

  await setAdminMasterSessionCookie(response, {
    authUserId: user.id,
    email: user.email,
    host: getRequestHost(request),
    mfaVerifiedAt: Math.floor(Date.now() / 1000),
  });

  void emitSecurityEvent({
    evento: "admin_master_mfa_sucesso",
    tipoUsuario: "salao",
    userId: user.id,
    risco: "baixo",
    origem: "admin-master",
    route: "/api/admin-master/auth/finalize-mfa",
    detalhes: { admin_id: access.usuario.id },
  });

  return response;
}

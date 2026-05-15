import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sanitizeAdminMasterNextPath } from "@/lib/admin-master/auth/login-path";
import { resolveAdminMasterAccessForIdentity } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { setAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { getLoginErrorMessage } from "@/lib/supabase/auth-client-recovery";

type LoginRequestBody = {
  email?: string;
  password?: string;
  next?: string | null;
};

function getRequestHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0] ||
    request.headers.get("host")
  );
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as LoginRequestBody | null;
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const nextPath = sanitizeAdminMasterNextPath(body?.next) || null;

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        message: "Informe e-mail e senha para entrar no Admin Master.",
      },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    void emitSecurityEvent({
      evento: "admin_master_login_falhou",
      tipoUsuario: "salao",
      risco: "medio",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "admin-master",
      route: "/admin-master/login",
      detalhes: { email, motivo: error?.message || "usuario_nao_retornado" },
    });

    return NextResponse.json(
      {
        ok: false,
        message: getLoginErrorMessage(error),
      },
      { status: error?.status || 401 }
    );
  }

  const access = await resolveAdminMasterAccessForIdentity(
    {
      id: data.user.id,
      email: data.user.email,
      nome: String(data.user.user_metadata?.nome || ""),
    },
    "dashboard_ver"
  );

  if (!access.ok) {
    void emitSecurityEvent({
      evento: "admin_master_login_falhou",
      tipoUsuario: "salao",
      userId: data.user.id,
      risco: "medio",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "admin-master",
      route: "/admin-master/login",
      detalhes: { email, motivo: access.message },
    });

    return NextResponse.json(
      {
        ok: false,
        message: access.message,
      },
      { status: access.status }
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      redirectTo: nextPath || "/admin-master",
      usuario: {
        id: access.usuario.id,
        nome: access.usuario.nome,
        perfil: access.usuario.perfil,
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );

  await setAdminMasterSessionCookie(response, {
    authUserId: data.user.id,
    email,
    host: getRequestHost(request),
  });

  void emitSecurityEvent({
    evento: "admin_master_login_sucesso",
    tipoUsuario: "salao",
    userId: data.user.id,
    risco: "baixo",
    ip: getClientIp(request),
    userAgent: request.headers.get("user-agent") || null,
    origem: "admin-master",
    route: "/admin-master/login",
    detalhes: { email, admin_id: access.usuario.id },
  });

  return response;
}

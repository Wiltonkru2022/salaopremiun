import { NextResponse } from "next/server";
import { sanitizeAdminMasterNextPath } from "@/lib/admin-master/auth/login-path";
import { resolveAdminMasterAccessForIdentity } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { setAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { getAdminAuthProviderForSurface } from "@/lib/platform/provider-config.server";
import { readBearerToken, verifyClerkBearerToken } from "@/lib/platform/clerk-auth.server";

type RequestBody = {
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
  if (getAdminAuthProviderForSurface("admin-master") !== "clerk") {
    return NextResponse.json(
      { ok: false, message: "Clerk ainda não está ativo para o Admin Master." },
      { status: 409, headers: { "Cache-Control": "no-store" } }
    );
  }

  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Sessão Clerk não informada." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const nextPath = sanitizeAdminMasterNextPath(body?.next) || "/admin-master";

  try {
    const identity = await verifyClerkBearerToken(token);
    const email = String(identity.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { ok: false, message: "Sua conta Clerk não possui e-mail principal válido." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!identity.mfaVerified) {
      void emitSecurityEvent({
        evento: "admin_master_mfa_requerido",
        tipoUsuario: "salao",
        userId: identity.subject,
        risco: "baixo",
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
        origem: "admin-master-clerk",
        route: "/admin-master/login",
        detalhes: { email, provider: "clerk" },
      });

      return NextResponse.json(
        {
          ok: false,
          mfaRequired: true,
          message: "Conclua a autenticação em dois fatores no Clerk para entrar no Admin Master.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const nome = [identity.firstName, identity.lastName].filter(Boolean).join(" ").trim();
    const access = await resolveAdminMasterAccessForIdentity(
      {
        id: identity.subject,
        email,
        nome: nome || null,
      },
      "dashboard_ver"
    );

    if (!access.ok) {
      void emitSecurityEvent({
        evento: "admin_master_login_falhou",
        tipoUsuario: "salao",
        userId: identity.subject,
        risco: "medio",
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
        origem: "admin-master-clerk",
        route: "/admin-master/login",
        detalhes: { email, provider: "clerk", motivo: access.message },
      });

      return NextResponse.json(
        { ok: false, message: access.message },
        { status: access.status, headers: { "Cache-Control": "no-store" } }
      );
    }

    const response = NextResponse.json(
      {
        ok: true,
        redirectTo: nextPath,
        usuario: {
          id: access.usuario.id,
          nome: access.usuario.nome,
          perfil: access.usuario.perfil,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    await setAdminMasterSessionCookie(response, {
      authUserId: identity.subject,
      email,
      host: getRequestHost(request),
      mfaVerifiedAt: Math.floor(Date.now() / 1000),
    });

    void emitSecurityEvent({
      evento: "admin_master_login_sucesso",
      tipoUsuario: "salao",
      userId: identity.subject,
      risco: "baixo",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "admin-master-clerk",
      route: "/admin-master/login",
      detalhes: { email, provider: "clerk", mfa: "validado" },
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível validar sua sessão Clerk.",
      },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}

import { NextResponse } from "next/server";
import { sanitizeAdminMasterNextPath } from "@/lib/admin-master/auth/login-path";
import { authenticateAdminMasterPassword } from "@/lib/admin-master/auth/password-login.server";
import { resolveAdminMasterAccessForIdentity } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { setAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { clerkAdminApi } from "@/lib/platform/clerk-admin-api.server";
import { emitSecurityEvent } from "@/lib/security/security-events";

type RequestBody = {
  email?: string;
  password?: string;
  next?: string | null;
};

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function getRequestHost(request: Request) {
  return request.headers.get("x-forwarded-host")?.split(",")[0] || request.headers.get("host");
}

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

function safeStatus(error: unknown) {
  const status =
    typeof error === "object" && error && "status" in error
      ? Number((error as { status?: unknown }).status || 500)
      : 500;
  return [400, 401, 403, 404, 409, 422].includes(status) ? status : 500;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const nextPath = sanitizeAdminMasterNextPath(body?.next) || "/admin-master";

  try {
    const identity = await authenticateAdminMasterPassword({ email, password });

    let stableAuthId = String(identity.externalId || "").trim();

    if (!isUuid(stableAuthId)) {
      const db = getDatabaseAdmin();
      const { data: adminByEmail, error: adminLookupError } = await db
        .from("admin_master_usuarios")
        .select("auth_user_id")
        .eq("email", identity.email)
        .maybeSingle();

      if (adminLookupError) {
        throw new Error("Não foi possível validar o cadastro administrativo.");
      }

      const legacyAuthId = String(adminByEmail?.auth_user_id || "").trim();
      if (isUuid(legacyAuthId)) {
        stableAuthId = legacyAuthId;
        await clerkAdminApi
          .updateUserById(identity.clerkUserId, { externalId: legacyAuthId })
          .catch(() => undefined);
      }
    }

    if (!stableAuthId) stableAuthId = identity.clerkUserId;

    const access = await resolveAdminMasterAccessForIdentity(
      {
        id: stableAuthId,
        email: identity.email,
        nome: identity.nome,
      },
      "dashboard_ver"
    );

    if (!access.ok) {
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
      authUserId: stableAuthId,
      email: identity.email,
      host: getRequestHost(request),
      mfaVerifiedAt: 0,
    });

    void emitSecurityEvent({
      evento: "admin_master_login_sucesso",
      tipoUsuario: "salao",
      userId: stableAuthId,
      risco: "baixo",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "admin-master-password",
      route: "/admin-master/login",
      detalhes: {
        email: identity.email,
        provider: "clerk-backend-password",
        mfa: "nao_exigido",
      },
    });

    return response;
  } catch (error) {
    const status = safeStatus(error);
    const message =
      status === 401
        ? "E-mail ou senha inválidos."
        : error instanceof Error
          ? error.message
          : "Não foi possível concluir o login do Admin Master.";

    void emitSecurityEvent({
      evento: "admin_master_login_falha",
      tipoUsuario: "salao",
      userId: null,
      risco: status === 401 ? "medio" : "baixo",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "admin-master-password",
      route: "/admin-master/login",
      detalhes: { email, status },
    });

    return NextResponse.json(
      { ok: false, message },
      { status, headers: { "Cache-Control": "no-store" } }
    );
  }
}

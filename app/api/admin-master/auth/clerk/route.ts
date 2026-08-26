import { NextResponse } from "next/server";
import { sanitizeAdminMasterNextPath } from "@/lib/admin-master/auth/login-path";
import { resolveAdminMasterAccessForIdentity } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { setAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";
import { clerkAdminApi } from "@/lib/platform/clerk-admin-api.server";
import { readBearerToken, verifyClerkBearerToken } from "@/lib/platform/clerk-auth.server";

type RequestBody = { next?: string | null };

function getRequestHost(request: Request) {
  return request.headers.get("x-forwarded-host")?.split(",")[0] || request.headers.get("host");
}

function getClientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function buildMfaEnrollmentUrl(nextPath: string) {
  const backToLogin = `/admin-master/clerk-login?next=${encodeURIComponent(nextPath)}`;
  return `/conta-clerk?next=${encodeURIComponent(backToLogin)}`;
}

export async function POST(request: Request) {
  if (getAuthProviderForSurface("admin-master") !== "clerk") {
    return NextResponse.json({ ok: false, message: "Clerk ainda não está ativo para o Admin Master." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }

  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, message: "Sessão Clerk não informada." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const body = (await request.json().catch(() => null)) as RequestBody | null;
  const nextPath = sanitizeAdminMasterNextPath(body?.next) || "/admin-master";

  try {
    const identity = await verifyClerkBearerToken(token);
    const email = String(identity.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, message: "Sua conta Clerk não possui e-mail principal válido." }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const { data: clerkData, error: clerkError } = await clerkAdminApi.getUserById(identity.subject);
    if (clerkError || !clerkData.user) {
      return NextResponse.json(
        { ok: false, message: clerkError?.message || "Não foi possível carregar sua conta Clerk." },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const accountMfaEnrolled = Boolean(clerkData.user.two_factor_enabled);
    if (!accountMfaEnrolled || !identity.mfaVerified) {
      const enrollmentRequired = !accountMfaEnrolled;
      void emitSecurityEvent({
        evento: "admin_master_mfa_requerido",
        tipoUsuario: "salao",
        userId: identity.subject,
        risco: "baixo",
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
        origem: "admin-master-clerk",
        route: "/admin-master/login",
        detalhes: {
          email,
          provider: "clerk",
          enrollment_required: enrollmentRequired,
        },
      });
      return NextResponse.json(
        {
          ok: false,
          mfaRequired: true,
          mfaEnrollmentRequired: enrollmentRequired,
          redirectTo: enrollmentRequired ? buildMfaEnrollmentUrl(nextPath) : undefined,
          message: enrollmentRequired
            ? "Cadastre a autenticação em dois fatores no Clerk antes de entrar no Admin Master."
            : "Conclua a autenticação em dois fatores no Clerk para entrar no Admin Master.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    let stableAuthId = String(clerkData.user.externalId || "").trim();

    // Contas existentes podem ter o UUID histórico somente no Neon. No primeiro
    // login Clerk, espelhamos esse UUID em external_id e preservamos os vínculos.
    if (!isUuid(stableAuthId)) {
      const db = getDatabaseAdmin();
      const { data: adminByEmail } = await db
        .from("admin_master_usuarios")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();
      const legacyAuthId = String(adminByEmail?.auth_user_id || "").trim();
      if (isUuid(legacyAuthId)) {
        stableAuthId = legacyAuthId;
        await clerkAdminApi
          .updateUserById(identity.subject, { externalId: legacyAuthId })
          .catch(() => undefined);
      }
    }

    if (!stableAuthId) stableAuthId = identity.subject;

    const nome = [identity.firstName, identity.lastName].filter(Boolean).join(" ").trim();
    const access = await resolveAdminMasterAccessForIdentity(
      { id: stableAuthId, email, nome: nome || null },
      "dashboard_ver"
    );

    if (!access.ok) {
      return NextResponse.json({ ok: false, message: access.message }, { status: access.status, headers: { "Cache-Control": "no-store" } });
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: nextPath,
      usuario: { id: access.usuario.id, nome: access.usuario.nome, perfil: access.usuario.perfil },
    }, { status: 200, headers: { "Cache-Control": "no-store" } });

    await setAdminMasterSessionCookie(response, {
      authUserId: stableAuthId,
      email,
      host: getRequestHost(request),
      mfaVerifiedAt: Math.floor(Date.now() / 1000),
    });

    void emitSecurityEvent({
      evento: "admin_master_login_sucesso",
      tipoUsuario: "salao",
      userId: stableAuthId,
      risco: "baixo",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "admin-master-clerk",
      route: "/admin-master/login",
      detalhes: {
        email,
        provider: "clerk",
        clerk_subject: identity.subject,
        mfa: "validado",
      },
    });

    return response;
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "Não foi possível validar sua sessão Clerk.",
    }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}

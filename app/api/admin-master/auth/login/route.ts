import { NextResponse } from "next/server";
import { sanitizeAdminMasterNextPath } from "@/lib/admin-master/auth/login-path";
import { authenticateAdminMasterPassword } from "@/lib/admin-master/auth/password-login.server";
import { resolveAdminMasterPasswordAccess } from "@/lib/admin-master/auth/password-access-neon.server";
import { setAdminMasterSessionCookie } from "@/lib/admin-master/auth/session";
import { clerkAdminApi } from "@/lib/platform/clerk-admin-api.server";

type RequestBody = {
  email?: string;
  password?: string;
  next?: string | null;
};

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim(),
  );
}

function getRequestHost(request: Request) {
  return request.headers.get("x-forwarded-host")?.split(",")[0] || request.headers.get("host");
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
    // 1) Autentica senha diretamente no backend do Clerk.
    const identity = await authenticateAdminMasterPassword({ email, password });

    // 2) Valida cadastro/permissão diretamente no Neon com SQL tipado.
    // Não passa pelo adapter Supabase-like, eliminando o erro PostgreSQL 42P18.
    const access = await resolveAdminMasterPasswordAccess({
      email: identity.email,
      clerkUserId: identity.clerkUserId,
      externalId: identity.externalId,
      nome: identity.nome,
    });

    // 3) Se o Neon possui o UUID legado e o Clerk ainda não, sincroniza external_id.
    if (
      isUuid(access.authUserId) &&
      String(identity.externalId || "").trim() !== access.authUserId
    ) {
      await clerkAdminApi
        .updateUserById(identity.clerkUserId, { externalId: access.authUserId })
        .catch(() => undefined);
    }

    // 4) Cria a sessão própria do Admin Master.
    const response = NextResponse.json(
      {
        ok: true,
        redirectTo: nextPath,
        usuario: {
          id: access.id,
          nome: access.nome,
          perfil: access.perfil,
        },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );

    await setAdminMasterSessionCookie(response, {
      authUserId: access.authUserId,
      email: access.email,
      host: getRequestHost(request),
      mfaVerifiedAt: 0,
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

    return NextResponse.json(
      { ok: false, message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

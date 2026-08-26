import { NextResponse } from "next/server";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";
import { clerkAdminApi } from "@/lib/platform/clerk-admin-api.server";
import { readBearerToken, verifyClerkBearerToken } from "@/lib/platform/clerk-auth.server";
import { createPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNext(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard?boot=1";
  return raw;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "").trim()
  );
}

function buildMfaEnrollmentUrl(nextPath: string) {
  const backToLogin = `/login-clerk?next=${encodeURIComponent(nextPath)}`;
  return `/conta-clerk?next=${encodeURIComponent(backToLogin)}`;
}

export async function POST(request: Request) {
  if (getAuthProviderForSurface("painel") !== "clerk") {
    return NextResponse.json({ ok: false, message: "Clerk nao esta ativo no painel." }, { status: 409 });
  }

  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, message: "Sessao Clerk ausente." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { next?: unknown };
  const nextPath = safeNext(body.next);

  try {
    const identity = await verifyClerkBearerToken(token);
    if (!identity.email) {
      return NextResponse.json({ ok: false, message: "Conta Clerk sem e-mail valido." }, { status: 403 });
    }

    const { data: clerkData, error: clerkError } = await clerkAdminApi.getUserById(identity.subject);
    if (clerkError || !clerkData.user) {
      return NextResponse.json(
        { ok: false, message: clerkError?.message || "Nao foi possivel carregar a conta Clerk." },
        { status: 401 }
      );
    }

    const clerkExternalId = String(clerkData.user.externalId || "").trim();

    const db = getDatabaseAdmin();
    let usuario: any = null;
    let lookupError: any = null;

    // O UUID interno permanece a identidade relacional do Neon. Para contas já
    // migradas, ele fica espelhado no external_id do Clerk.
    if (isUuid(clerkExternalId)) {
      const result = await db
        .from("usuarios")
        .select("id, id_salao, nome, email, nivel, status, auth_user_id")
        .eq("auth_user_id", clerkExternalId)
        .eq("status", "ativo")
        .maybeSingle();
      usuario = result.data;
      lookupError = result.error;
    }

    // Compatibilidade para contas antigas ainda sem external_id no Clerk.
    if (!usuario && !lookupError) {
      const result = await db
        .from("usuarios")
        .select("id, id_salao, nome, email, nivel, status, auth_user_id")
        .ilike("email", identity.email)
        .eq("status", "ativo")
        .maybeSingle();
      usuario = result.data;
      lookupError = result.error;
    }

    if (lookupError || !usuario?.id || !usuario?.id_salao) {
      return NextResponse.json(
        { ok: false, message: "Este usuario Clerk nao esta vinculado a um usuario ativo do SalaoPremium." },
        { status: 403 }
      );
    }

    // Faz o backfill seguro sem alterar o UUID já usado pelas tabelas/RPCs Neon.
    const internalAuthId = String(usuario.auth_user_id || "").trim();
    if (isUuid(internalAuthId) && clerkExternalId !== internalAuthId) {
      await clerkAdminApi
        .updateUserById(identity.subject, { externalId: internalAuthId })
        .catch(() => undefined);
    }

    const isAdmin = String(usuario.nivel || "").trim().toLowerCase() === "admin";
    if (isAdmin) {
      const accountMfaEnrolled = Boolean(clerkData.user.two_factor_enabled);
      if (!accountMfaEnrolled) {
        return NextResponse.json(
          {
            ok: false,
            mfaRequired: true,
            mfaEnrollmentRequired: true,
            redirectTo: buildMfaEnrollmentUrl(nextPath),
            message: "Cadastre a autenticação em dois fatores no Clerk antes de entrar como administrador.",
          },
          { status: 403 }
        );
      }
      if (!identity.mfaVerified) {
        return NextResponse.json(
          {
            ok: false,
            mfaRequired: true,
            mfaEnrollmentRequired: false,
            message: "Conclua o segundo fator no Clerk para entrar como administrador.",
          },
          { status: 403 }
        );
      }
    }

    await createPainelClerkSession({
      clerkSubject: identity.subject,
      userId: String(usuario.id),
      idSalao: String(usuario.id_salao),
      nome: usuario.nome ? String(usuario.nome) : null,
      email: usuario.email ? String(usuario.email) : identity.email,
      nivel: usuario.nivel ? String(usuario.nivel) : null,
      status: usuario.status ? String(usuario.status) : null,
      mfaVerified: isAdmin ? identity.mfaVerified : identity.mfaVerified || !identity.mfaEnrolled,
    });

    return NextResponse.json({ ok: true, redirectTo: nextPath });
  } catch (cause) {
    return NextResponse.json(
      { ok: false, message: cause instanceof Error ? cause.message : "Falha ao validar Clerk." },
      { status: 401 }
    );
  }
}

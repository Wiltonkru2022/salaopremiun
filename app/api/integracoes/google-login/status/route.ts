import { NextResponse } from "next/server";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { findSalaoUsuarioByAuthOrEmail } from "@/lib/security/salao-user-lookup";
import { readPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";
import { clerkAdminApi } from "@/lib/platform/clerk-admin-api.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await readPainelClerkSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401 }
    );
  }

  const { data, error } = await clerkAdminApi.getUserById(session.clerkSubject);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message ||
          "Não foi possível consultar os vínculos de login desta conta.",
      },
      { status: 500 }
    );
  }

  const identities = data.user?.identities || [];
  const googleIdentity = identities.find(
    (identity) => identity.provider === "google"
  );

  return NextResponse.json({
    ok: true,
    connected: Boolean(googleIdentity),
    googleEmail: googleIdentity?.identity_data?.email || session.email || null,
    identitiesCount: identities.length,
  });
}

export async function DELETE() {
  const session = await readPainelClerkSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida." },
      { status: 401 }
    );
  }

  const { data, error } = await clerkAdminApi.getUserById(session.clerkSubject);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error.message ||
          "Não foi possível consultar os vínculos de login desta conta.",
      },
      { status: 500 }
    );
  }

  const identities = data.user?.identities || [];
  const googleIdentity = identities.find(
    (identity) => identity.provider === "google"
  );

  if (!googleIdentity) {
    return NextResponse.json({
      ok: true,
      removed: false,
      message: "Esta conta já não possui login com Google vinculado.",
    });
  }

  if (identities.length < 2) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Para remover o login com Google, mantenha e-mail e senha ativos nesta conta.",
      },
      { status: 409 }
    );
  }

  const { error: unlinkError } = await clerkAdminApi.unlinkExternalAccount(
    session.clerkSubject,
    googleIdentity.provider
  );

  if (unlinkError) {
    return NextResponse.json(
      {
        ok: false,
        error:
          unlinkError.message ||
          "Não foi possível remover o login com Google desta conta.",
      },
      { status: 409 }
    );
  }

  const usuario = await findSalaoUsuarioByAuthOrEmail({
    authUserId: session.clerkSubject,
    email: String(session.email || "").trim().toLowerCase(),
  });

  void emitSecurityEvent({
    evento: "google_login_desconectado",
    tipoUsuario: "salao",
    userId: usuario?.id || session.clerkSubject,
    idSalao: usuario?.id_salao || null,
    risco: "baixo",
    origem: "google-login",
    route: "/api/integracoes/google-login/status",
    detalhes: {
      email: usuario?.email || session.email || null,
      google_email: googleIdentity.identity_data?.email || null,
    },
  });

  return NextResponse.json({
    ok: true,
    removed: true,
    message:
      "Login com Google removido. Esta conta continua entrando por e-mail e senha.",
  });
}

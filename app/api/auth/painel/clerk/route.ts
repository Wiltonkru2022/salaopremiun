import { NextResponse } from "next/server";
import { getDatabaseAdmin } from "@/lib/db/admin";
import { getAuthProviderForSurface } from "@/lib/platform/provider-config.server";
import { readBearerToken, verifyClerkBearerToken } from "@/lib/platform/clerk-auth.server";
import { createPainelClerkSession } from "@/lib/platform/painel-clerk-session.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNext(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard?boot=1";
  return raw;
}

export async function POST(request: Request) {
  if (getAuthProviderForSurface("painel") !== "clerk") {
    return NextResponse.json({ ok: false, message: "Clerk nao esta ativo no painel." }, { status: 409 });
  }

  const token = readBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, message: "Sessao Clerk ausente." }, { status: 401 });
  }

  try {
    const identity = await verifyClerkBearerToken(token);
    if (!identity.email) {
      return NextResponse.json({ ok: false, message: "Conta Clerk sem e-mail valido." }, { status: 403 });
    }

    const db = getDatabaseAdmin();
    const { data: usuario, error } = await db
      .from("usuarios")
      .select("id, id_salao, nome, email, nivel, status")
      .ilike("email", identity.email)
      .eq("status", "ativo")
      .maybeSingle();

    if (error || !usuario?.id || !usuario?.id_salao) {
      return NextResponse.json(
        { ok: false, message: "Este usuario Clerk nao esta vinculado a um usuario ativo do SalaoPremium." },
        { status: 403 }
      );
    }

    const isAdmin = String(usuario.nivel || "").trim().toLowerCase() === "admin";
    if (isAdmin && identity.mfaEnrolled && !identity.mfaVerified) {
      return NextResponse.json(
        { ok: false, mfaRequired: true, message: "Conclua o segundo fator no Clerk para entrar como administrador." },
        { status: 403 }
      );
    }

    await createPainelClerkSession({
      clerkSubject: identity.subject,
      userId: String(usuario.id),
      idSalao: String(usuario.id_salao),
      nome: usuario.nome ? String(usuario.nome) : null,
      email: usuario.email ? String(usuario.email) : identity.email,
      nivel: usuario.nivel ? String(usuario.nivel) : null,
      status: usuario.status ? String(usuario.status) : null,
      mfaVerified: identity.mfaVerified || !identity.mfaEnrolled,
    });

    const body = (await request.json().catch(() => ({}))) as { next?: unknown };
    return NextResponse.json({ ok: true, redirectTo: safeNext(body.next) });
  } catch (cause) {
    return NextResponse.json(
      { ok: false, message: cause instanceof Error ? cause.message : "Falha ao validar Clerk." },
      { status: 401 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { findSalaoUsuarioByEmail } from "@/lib/security/salao-user-lookup";
import {
  getClerkMigrationRedirect,
  sendClerkMigrationInvitation,
} from "@/lib/platform/clerk-invitations.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const publicRoute =
  "rota publica de primeiro acesso: envia convite Clerk somente para e-mail ativo existente no Neon, com resposta nao enumeravel e rate limit.";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function genericResponse() {
  return NextResponse.json(
    {
      ok: true,
      message:
        "Se este e-mail pertencer a um acesso ativo que precise de atualização, você receberá um convite seguro para concluir o primeiro acesso.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = String(body.email || "").trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, message: "Informe um e-mail valido." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    assertPublicRateLimit({
      key: getPublicRateLimitIdentity(request, `clerk-first-access:${email}`),
      limit: 2,
      windowMs: 30 * 60 * 1000,
    });

    const usuario = await findSalaoUsuarioByEmail(email);
    const ativo = String(usuario?.status || "").trim().toLowerCase() === "ativo";

    if (usuario?.id && ativo) {
      await sendClerkMigrationInvitation({
        email,
        redirectUrl: getClerkMigrationRedirect("painel"),
      }).catch(() => undefined);

      void emitSecurityEvent({
        evento: "clerk_primeiro_acesso_solicitado",
        tipoUsuario: "salao",
        userId: String(usuario.id),
        idSalao: usuario.id_salao ? String(usuario.id_salao) : null,
        risco: "baixo",
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
        origem: "clerk-first-access",
        route: "/api/auth/painel/migrate-to-clerk",
        detalhes: { provider: "clerk" },
      });
    }
  } catch {
    // A resposta permanece identica para nao revelar existencia de contas nem
    // detalhes de rate limit/Clerk para uma rota publica.
  }

  return genericResponse();
}

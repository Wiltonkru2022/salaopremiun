import { NextResponse } from "next/server";
import { getDatabaseAdmin } from "@/lib/db/admin";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { emitSecurityEvent } from "@/lib/security/security-events";
import {
  getClerkMigrationRedirect,
  sendClerkMigrationInvitation,
} from "@/lib/platform/clerk-invitations.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const publicRoute =
  "rota publica de primeiro acesso Admin Master: convite Clerk somente para e-mail ativo existente no Neon, com resposta nao enumeravel e rate limit.";

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
        "Se este e-mail pertencer a uma conta administrativa ativa que precise de atualização, você receberá um convite seguro para concluir o primeiro acesso.",
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
      key: getPublicRateLimitIdentity(request, `admin-master-clerk-first-access:${email}`),
      limit: 2,
      windowMs: 30 * 60 * 1000,
    });

    const db = getDatabaseAdmin();
    const { data: usuario } = await db
      .from("admin_master_usuarios")
      .select("id, email, status")
      .eq("email", email)
      .maybeSingle();

    const ativo = String(usuario?.status || "").trim().toLowerCase() === "ativo";
    if (usuario?.id && ativo) {
      await sendClerkMigrationInvitation({
        email,
        redirectUrl: getClerkMigrationRedirect("admin-master"),
      }).catch(() => undefined);

      void emitSecurityEvent({
        evento: "admin_master_clerk_primeiro_acesso_solicitado",
        tipoUsuario: "salao",
        userId: String(usuario.id),
        risco: "baixo",
        ip: getClientIp(request),
        userAgent: request.headers.get("user-agent") || null,
        origem: "admin-master-clerk-first-access",
        route: "/api/admin-master/auth/migrate-to-clerk",
        detalhes: { provider: "clerk" },
      });
    }
  } catch {
    // Nao revelamos existencia da conta, detalhes do Clerk ou estado do rate limit.
  }

  return genericResponse();
}

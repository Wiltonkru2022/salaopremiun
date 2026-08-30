import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { findSalaoUsuarioByEmail } from "@/lib/security/salao-user-lookup";
import { getLoginUrl } from "@/lib/site-urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const publicRoute = "rota publica: encaminha recuperacao de senha para o Clerk com limite por IP.";

const CLERK_RECOVERY_URL = getLoginUrl(
  "/login?motivo=recuperar_senha"
);

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
      key: getPublicRateLimitIdentity(request, `password-recovery:${email}`),
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    const usuario = await findSalaoUsuarioByEmail(email);

    void emitSecurityEvent({
      evento: "recuperacao_senha_solicitada",
      tipoUsuario: "salao",
      userId: usuario?.id || null,
      idSalao: usuario?.id_salao || null,
      risco: "baixo",
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") || null,
      origem: "password-recovery-clerk",
      route: "/recuperar-senha",
      detalhes: { email, provider: "clerk" },
    });

    // O Clerk gerencia o desafio, o envio e a troca de senha. Nao revelamos se
    // o e-mail existe no Neon para evitar enumeracao de contas.
    return NextResponse.json(
      { ok: true, provider: "clerk", redirectTo: CLERK_RECOVERY_URL },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: true, provider: "clerk", redirectTo: CLERK_RECOVERY_URL },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}

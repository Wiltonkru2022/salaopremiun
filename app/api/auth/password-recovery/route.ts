import { NextResponse } from "next/server";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { findSalaoUsuarioByEmail } from "@/lib/security/salao-user-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const publicRoute = "rota pública: recuperação de senha com limite por IP.";

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
      { message: "Informe um e-mail válido." },
      { status: 400 }
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
      origem: "password-recovery",
      route: "/recuperar-senha",
      detalhes: { email, provider: "clerk" },
    });

    const redirect = new URL("https://login.salaopremiun.com.br/login-clerk");
    redirect.searchParams.set("mode", "recovery");
    redirect.searchParams.set("email", email);
    redirect.searchParams.set("next", "/dashboard");

    return NextResponse.json({
      ok: true,
      provider: "clerk",
      redirectTo: redirect.toString(),
    });
  } catch (error) {
    console.error("[PASSWORD_RECOVERY_ERROR]", {
      error: error instanceof Error ? error.message : "erro_desconhecido",
    });
    return NextResponse.json(
      { message: "Não foi possível iniciar a recuperação de acesso." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { emitSecurityEvent } from "@/lib/security/security-events";
import { recordSecurityLoginFailure } from "@/lib/security/login-attempts";
import {
  assertPublicRateLimit,
  getPublicRateLimitIdentity,
} from "@/lib/security/public-rate-limit";
import { findSalaoUsuarioByEmail } from "@/lib/security/salao-user-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  evento?: "login_falhou" | "login_sucesso";
  origem?: string;
  route?: string;
  detalhes?: Record<string, unknown>;
};

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Body;
  const email = String(body.email || "").trim().toLowerCase();
  const evento = body.evento === "login_sucesso" ? "login_sucesso" : "login_falhou";
  const origem = String(body.origem || "login-salao").trim() || "login-salao";
  const route = String(body.route || "/login").trim() || "/login";
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || null;

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "E-mail invalido." },
      { status: 400 }
    );
  }

  assertPublicRateLimit({
    key: getPublicRateLimitIdentity(request, `security-login-event:${email}`),
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });

  const usuario = await findSalaoUsuarioByEmail(email);

  if (evento === "login_falhou") {
    const result = await recordSecurityLoginFailure({
      tipoUsuario: "salao",
      userId: usuario?.id || null,
      idSalao: usuario?.id_salao || null,
      identidade: email,
      ip,
      userAgent,
      origem,
      route,
      detalhes: body.detalhes || null,
    });

    return NextResponse.json({
      ok: true,
      blocked: result.blocked,
      status: result.status,
      redirectTo: result.redirectTo || null,
      attempts10m: result.attempts10m,
      attempts1h: result.attempts1h,
    });
  }

  void emitSecurityEvent({
    evento: "login_sucesso",
    tipoUsuario: "salao",
    userId: usuario?.id || null,
    idSalao: usuario?.id_salao || null,
    risco: "baixo",
    ip,
    userAgent,
    origem,
    route,
    detalhes: {
      email,
      usuario_encontrado: Boolean(usuario?.id),
      ...(body.detalhes || {}),
    },
  });

  return NextResponse.json({ ok: true });
}

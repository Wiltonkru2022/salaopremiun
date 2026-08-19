import { NextResponse } from "next/server";
import { createProfissionalSession } from "@/lib/profissional-auth.server";
import { loginProfissionalByCpfSenha } from "@/app/services/profissional/auth";
import {
  assertProfissionalLoginAllowed,
  clearProfissionalLoginFailures,
  registerProfissionalLoginFailure,
} from "@/lib/security/profissional-login-rate-limit";

function normalizeCpf(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function buildRateLimitKey(request: Request, cpf: string) {
  const forwardedFor = request.headers.get("x-forwarded-for") || "";
  const ip = forwardedFor.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "sem-ip";
  const userAgent = request.headers.get("user-agent") || "sem-user-agent";
  return `${normalizeCpf(cpf)}|${ip}|${userAgent.slice(0, 80)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cpf = String(body.cpf || "");
    const senha = String(body.senha || "");
    const rateLimitKey = buildRateLimitKey(request, cpf);

    try {
      await assertProfissionalLoginAllowed(rateLimitKey);
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Muitas tentativas. Aguarde antes de tentar novamente.",
        },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await loginProfissionalByCpfSenha(cpf, senha);

    if (!result.ok) {
      if (!result.redirectTo) {
        await registerProfissionalLoginFailure(rateLimitKey).catch(() => undefined);
      }
      return NextResponse.json(
        { ok: false, error: result.error },
        {
          status: result.redirectTo ? 403 : 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    await clearProfissionalLoginFailures(rateLimitKey).catch(() => undefined);
    await createProfissionalSession(result.session);
    return NextResponse.json(
      {
        ok: true,
        profissional: {
          id: result.session.idProfissional,
          id_salao: result.session.idSalao,
          nome: result.session.nome,
          cpf: result.session.cpf,
          nivel_acesso: result.session.nivelAcesso,
          podeVerAgendaTodos: result.session.podeVerAgendaTodos,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[APP_PROFISSIONAL_LOGIN_ERROR]", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Problema temporário do sistema. Tente novamente em instantes.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

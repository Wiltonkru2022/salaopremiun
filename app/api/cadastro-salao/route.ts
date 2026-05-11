import { NextResponse } from "next/server";
import {
  CadastroSalaoUseCaseError,
  cadastrarSalaoUseCase,
} from "@/core/use-cases/cadastro-salao/cadastrarSalao";
import { createCadastroSalaoService } from "@/services/cadastroSalaoService";
import { sendCadastroSalaoWelcomeEmail } from "@/services/cadastroSalaoWelcomeEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CadastroSalaoRequestBody = {
  email?: string;
  nomeSalao?: string;
  responsavel?: string;
};

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "Não informado";

  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "Não informado"
  );
}

function buildPublicUrl(pathname: string, fallbackHost: string) {
  const host = String(fallbackHost || "salaopremiun.com.br")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  return `https://${host}${pathname}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | CadastroSalaoRequestBody
      | null;
    const result = await cadastrarSalaoUseCase({
      body,
      service: createCadastroSalaoService(),
    });

    if (result.body.ok && body?.email && body?.nomeSalao && body?.responsavel) {
      const loginHost =
        process.env.APP_LOGIN_HOST || "login.salaopremiun.com.br";
      const loginUrl = buildPublicUrl("/login", loginHost);
      const recoveryUrl = buildPublicUrl("/recuperar-senha", loginHost);

      await sendCadastroSalaoWelcomeEmail({
        idSalao: result.body.id_salao,
        nomeSalao: body.nomeSalao,
        responsavel: body.responsavel,
        email: String(body.email).trim().toLowerCase(),
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent") || "Não informado",
        trialFimEm: result.body.assinatura?.trial_fim_em,
        loginUrl,
        recoveryUrl,
      }).catch((error) => {
        console.error("[CADASTRO_SALAO_WELCOME_EMAIL_ERROR]", {
          idSalao: result.body.id_salao,
          error: error instanceof Error ? error.message : "erro_desconhecido",
        });
      });
    }

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof CadastroSalaoUseCaseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erro interno no cadastro.",
      },
      { status: 500 }
    );
  }
}

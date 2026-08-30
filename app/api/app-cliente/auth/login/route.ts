import { NextRequest, NextResponse } from "next/server";
import { loginClienteAppByCpfNascimento } from "@/app/services/cliente-app/auth";
import { assertClienteCpfLoginAllowed } from "@/lib/client-app/login-rate-limit";
import { safeAppClienteNext } from "@/lib/client-app/safe-next";
import { setClienteSessionOnResponse } from "@/lib/cliente-auth.server";

export const dynamic = "force-dynamic";

function requestMetadata(request: NextRequest) {
  const forwarded = String(
    request.headers.get("x-forwarded-for") || ""
  );

  return {
    ip:
      forwarded.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null,
    userAgent:
      request.headers.get("user-agent") ||
      null,
  };
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Requisição inválida.",
      },
      { status: 400 }
    );
  }

  const cpf = String(body.cpf || "");
  const dataNascimento = String(
    body.dataNascimento || ""
  );
  const idSalao =
    String(body.salao || "").trim() || null;
  const next = safeAppClienteNext(
    body.next == null ? null : String(body.next)
  );

  const metadata = requestMetadata(request);

  try {
    const limit =
      await assertClienteCpfLoginAllowed({
        cpf,
        ip: metadata.ip,
      });

    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.",
        },
        { status: 429 }
      );
    }
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Não foi possível validar o acesso agora. Tente novamente.",
      },
      { status: 503 }
    );
  }

  const result =
    await loginClienteAppByCpfNascimento({
      cpf,
      dataNascimento,
      idSalao,
      ...metadata,
    });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          result.error ||
          "Não foi possível validar os dados informados.",
        redirectTo:
          result.redirectTo || null,
      },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    next,
  });

  setClienteSessionOnResponse(
    request,
    response,
    result.session
  );

  return response;
}

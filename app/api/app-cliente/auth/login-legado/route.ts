import { NextRequest, NextResponse } from "next/server";
import { loginClienteAppByEmailSenha } from "@/app/services/cliente-app/auth";
import { safeAppClienteNext } from "@/lib/client-app/safe-next";
import { setClienteSessionOnResponse } from "@/lib/cliente-auth.server";

export const dynamic = "force-dynamic";

// publicRoute: login legado precisa ser publico; valida credenciais no serviço de autenticação antes de criar sessão.

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<
      string,
      unknown
    >;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requisição inválida." },
      { status: 400 }
    );
  }

  const identidade = String(
    body.identidade || ""
  );
  const senha = String(body.senha || "");
  const idSalao =
    String(body.salao || "").trim() || null;
  let next = safeAppClienteNext(
    body.next == null ? null : String(body.next)
  );

  const result = await loginClienteAppByEmailSenha({
    email: identidade,
    senha,
    idSalao,
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

  if (result.migrationRequired) {
    next = `/app-cliente/atualizar-acesso?next=${encodeURIComponent(
      next
    )}`;
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

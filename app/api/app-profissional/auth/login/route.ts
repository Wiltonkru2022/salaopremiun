import { NextResponse } from "next/server";
import { createProfissionalSession } from "@/lib/profissional-auth.server";
import { loginProfissionalByCpfSenha } from "@/app/services/profissional/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const result = await loginProfissionalByCpfSenha(
      String(body.cpf || ""),
      String(body.senha || "")
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.redirectTo ? 403 : 401 }
      );
    }

    await createProfissionalSession(result.session);
    return NextResponse.json({
      ok: true,
      profissional: {
        id: result.session.idProfissional,
        id_salao: result.session.idSalao,
        nome: result.session.nome,
        cpf: result.session.cpf,
        nivel_acesso: result.session.nivelAcesso,
        podeVerAgendaTodos: result.session.podeVerAgendaTodos,
      },
    });
  } catch (error) {
    console.error("[APP_PROFISSIONAL_LOGIN_ERROR]", {
      message: error instanceof Error ? error.message : "erro_desconhecido",
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Não foi possível concluir o acesso agora. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}

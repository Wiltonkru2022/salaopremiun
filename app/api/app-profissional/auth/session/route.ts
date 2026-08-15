import { NextResponse } from "next/server";
import { validateProfissionalAppSession } from "@/lib/profissional-context.server";

export async function GET() {
  const validation = await validateProfissionalAppSession().catch(() => ({
    context: null,
    reason: "unauthorized" as const,
  }));

  if (!validation.context) {
    return NextResponse.json(
      { ok: false, reason: validation.reason },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    profissional: {
      id: validation.context.idProfissional,
      id_salao: validation.context.idSalao,
      nome: validation.context.nome,
      cpf: "",
      nivel_acesso: validation.context.nivelAcesso,
      podeVerAgendaTodos: validation.context.podeVerAgendaTodos,
    },
  });
}

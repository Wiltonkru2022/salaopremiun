import { NextResponse } from "next/server";
import { excluirConversaSuporte } from "@/app/services/profissional/suporte";
import { getProfissionalSessionFromCookie } from "@/lib/profissional-auth.server";

export async function POST(req: Request) {
  try {
    const session = await getProfissionalSessionFromCookie();

    if (!session) {
      return NextResponse.json(
        { error: "Sessao do profissional nao encontrada." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const conversaId = String(body?.conversaId || "").trim();

    if (!conversaId) {
      return NextResponse.json(
        { error: "Conversa não informada." },
        { status: 400 }
      );
    }

    await excluirConversaSuporte({
      idConversa: conversaId,
      idSalao: session.idSalao,
      idProfissional: session.idProfissional,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao finalizar chat." },
      { status: 500 }
    );
  }
}

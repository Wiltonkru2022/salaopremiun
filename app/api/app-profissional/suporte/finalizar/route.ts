import { NextResponse } from "next/server";
import { excluirConversaSuporte } from "@/app/services/profissional/suporte";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const conversaId = String(body?.conversaId || "").trim();

    if (!conversaId) {
      return NextResponse.json(
        { error: "Conversa não informada." },
        { status: 400 }
      );
    }

    await excluirConversaSuporte(conversaId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao finalizar chat." },
      { status: 500 }
    );
  }
}
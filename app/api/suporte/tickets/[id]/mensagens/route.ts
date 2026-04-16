import { NextRequest, NextResponse } from "next/server";
import {
  getPainelTicketContext,
  replySalaoTicket,
} from "@/lib/support/tickets";

type Payload = {
  mensagem?: string;
};

function buildErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
  }

  if (message === "NOT_FOUND") {
    return NextResponse.json({ ok: false, error: "Ticket nao encontrado." }, { status: 404 });
  }

  if (message === "INVALID_PAYLOAD") {
    return NextResponse.json(
      { ok: false, error: "Digite a mensagem para responder o ticket." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getPainelTicketContext();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Payload;
    const result = await replySalaoTicket({
      context,
      idTicket: id,
      mensagem: body.mensagem || "",
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return buildErrorResponse(error, "Erro ao responder ticket.");
  }
}

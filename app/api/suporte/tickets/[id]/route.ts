import { NextRequest, NextResponse } from "next/server";
import {
  getPainelTicketContext,
  getSalaoTicketDetail,
} from "@/lib/support/tickets";

function buildErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
  }

  if (message === "NOT_FOUND") {
    return NextResponse.json({ ok: false, error: "Ticket nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getPainelTicketContext();
    const { id } = await ctx.params;
    const detail = await getSalaoTicketDetail({
      idSalao: context.idSalao,
      idTicket: id,
    });

    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return buildErrorResponse(error, "Erro ao carregar ticket.");
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  getPainelTicketContext,
  updateSalaoTicketStatus,
} from "@/lib/support/tickets";

type Payload = {
  status?: "aberto" | "fechado";
  motivo?: string | null;
};

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

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getPainelTicketContext();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as Payload;
    const status = body.status === "fechado" ? "fechado" : "aberto";
    const result = await updateSalaoTicketStatus({
      context,
      idTicket: id,
      status,
      motivo: body.motivo || null,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return buildErrorResponse(error, "Erro ao atualizar ticket.");
  }
}

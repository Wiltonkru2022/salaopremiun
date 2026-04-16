import { NextRequest, NextResponse } from "next/server";
import {
  createSalaoTicket,
  getPainelTicketContext,
  listSalaoTickets,
} from "@/lib/support/tickets";

type CreateTicketPayload = {
  assunto?: string;
  categoria?: string | null;
  prioridade?: string | null;
  mensagem?: string;
  contexto?: Record<string, unknown>;
};

function buildErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;

  if (message === "UNAUTHORIZED") {
    return NextResponse.json({ ok: false, error: "Sessao invalida." }, { status: 401 });
  }

  if (message === "INVALID_PAYLOAD") {
    return NextResponse.json(
      { ok: false, error: "Preencha assunto e mensagem do ticket." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: false, error: message || fallback }, { status: 500 });
}

export async function GET() {
  try {
    const context = await getPainelTicketContext();
    const data = await listSalaoTickets(context.idSalao);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return buildErrorResponse(error, "Erro ao listar tickets.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getPainelTicketContext();
    const body = (await req.json().catch(() => ({}))) as CreateTicketPayload;
    const ticket = await createSalaoTicket({
      context,
      assunto: body.assunto || "",
      categoria: body.categoria || null,
      prioridade: body.prioridade || null,
      mensagem: body.mensagem || "",
      contexto: body.contexto || {},
    });

    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    return buildErrorResponse(error, "Erro ao abrir ticket.");
  }
}

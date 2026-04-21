import { NextRequest, NextResponse } from "next/server";
import {
  responderPainelTicketUseCase,
  SuporteTicketUseCaseError,
} from "@/core/use-cases/suporte/painelTickets";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const result = await responderPainelTicketUseCase({
      idTicket: id,
      body: await req.json().catch(() => ({})),
      service: createSuporteTicketService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof SuporteTicketUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Erro ao responder ticket." },
      { status: 500 }
    );
  }
}

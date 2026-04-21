import { NextRequest, NextResponse } from "next/server";
import {
  obterPainelTicketDetalheUseCase,
  SuporteTicketUseCaseError,
} from "@/core/use-cases/suporte/painelTickets";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const result = await obterPainelTicketDetalheUseCase({
      idTicket: id,
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
      { ok: false, error: "Erro ao carregar ticket." },
      { status: 500 }
    );
  }
}

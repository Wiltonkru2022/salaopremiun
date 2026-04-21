import { NextRequest, NextResponse } from "next/server";
import {
  criarPainelTicketUseCase,
  listarPainelTicketsUseCase,
  SuporteTicketUseCaseError,
} from "@/core/use-cases/suporte/painelTickets";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function GET() {
  try {
    const result = await listarPainelTicketsUseCase({
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
      { ok: false, error: "Erro ao listar tickets." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const result = await criarPainelTicketUseCase({
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
      { ok: false, error: "Erro ao abrir ticket." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  anexarPainelTicketUseCase,
  SuporteTicketUseCaseError,
} from "@/core/use-cases/suporte/painelTickets";
import { createSuporteTicketService } from "@/services/suporteTicketService";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const formData = await req.formData();
    const arquivo = formData.get("arquivo");
    const mensagem = String(formData.get("mensagem") || "");

    if (!(arquivo instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Selecione um arquivo para enviar." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const result = await anexarPainelTicketUseCase({
      idTicket: id,
      body: {
        bytes,
        contentType: arquivo.type || "application/octet-stream",
        fileName: arquivo.name || "arquivo",
        mensagem,
      },
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
      { ok: false, error: "Erro ao enviar anexo." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  AdminMasterTicketUseCaseError,
  responderAdminMasterTicketUseCase,
} from "@/core/use-cases/admin-master/tickets";
import { createAdminMasterTicketService } from "@/services/adminMasterTicketService";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const result = await responderAdminMasterTicketUseCase({
      idTicket: id,
      body: await req.json().catch(() => ({})),
      service: createAdminMasterTicketService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterTicketUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : "Erro ao responder ticket.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

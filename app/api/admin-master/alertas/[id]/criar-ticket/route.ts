import { NextRequest, NextResponse } from "next/server";
import {
  AdminMasterAlertaUseCaseError,
  criarTicketAdminMasterAlertaUseCase,
} from "@/core/use-cases/admin-master/alertas";
import { createAdminMasterAlertaService } from "@/services/adminMasterAlertaService";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const result = await criarTicketAdminMasterAlertaUseCase({
      idAlerta: id,
      body: await req.json().catch(() => ({})),
      service: createAdminMasterAlertaService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterAlertaUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Nao foi possivel criar ticket por alerta.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  AdminMasterOperacaoUseCaseError,
  criarTicketCheckoutAdminMasterUseCase,
} from "@/core/use-cases/admin-master/operacao";
import { createAdminMasterOperacaoService } from "@/services/adminMasterOperacaoService";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const result = await criarTicketCheckoutAdminMasterUseCase({
      idCheckoutLock: id,
      body: await req.json().catch(() => ({})),
      service: createAdminMasterOperacaoService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterOperacaoUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Erro ao criar ticket de reconciliacao.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

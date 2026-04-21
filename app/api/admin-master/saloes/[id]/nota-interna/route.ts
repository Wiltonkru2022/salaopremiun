import { NextRequest, NextResponse } from "next/server";
import {
  AdminMasterSalaoUseCaseError,
  criarNotaInternaAdminMasterSalaoUseCase,
} from "@/core/use-cases/admin-master/saloes";
import { createAdminMasterSalaoService } from "@/services/adminMasterSalaoService";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const result = await criarNotaInternaAdminMasterSalaoUseCase({
      idSalao: id,
      body: await req.json().catch(() => ({})),
      service: createAdminMasterSalaoService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterSalaoUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Erro ao criar nota interna.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

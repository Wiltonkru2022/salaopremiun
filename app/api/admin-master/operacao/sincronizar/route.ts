import { NextResponse } from "next/server";
import {
  AdminMasterOperacaoUseCaseError,
  sincronizarAdminMasterOperacaoUseCase,
} from "@/core/use-cases/admin-master/operacao";
import { createAdminMasterOperacaoService } from "@/services/adminMasterOperacaoService";

export async function POST() {
  try {
    const result = await sincronizarAdminMasterOperacaoUseCase({
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
      error instanceof Error ? error.message : "Erro ao sincronizar operacao.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

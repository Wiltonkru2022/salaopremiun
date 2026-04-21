import { NextRequest, NextResponse } from "next/server";
import {
  AdminMasterOperacaoUseCaseError,
  avaliarTrialExtraAdminMasterUseCase,
} from "@/core/use-cases/admin-master/operacao";
import { createAdminMasterOperacaoService } from "@/services/adminMasterOperacaoService";

export async function POST(req: NextRequest) {
  try {
    const result = await avaliarTrialExtraAdminMasterUseCase({
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
      error instanceof Error ? error.message : "Erro ao avaliar extensao de trial.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

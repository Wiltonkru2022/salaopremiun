import { NextResponse } from "next/server";
import {
  AdminMasterPlanoUseCaseError,
  listarAdminMasterPlanosUseCase,
} from "@/core/use-cases/admin-master/planos";
import { createAdminMasterPlanoService } from "@/services/adminMasterPlanoService";

export async function GET() {
  try {
    const result = await listarAdminMasterPlanosUseCase({
      service: createAdminMasterPlanoService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterPlanoUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : "Erro ao listar planos.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

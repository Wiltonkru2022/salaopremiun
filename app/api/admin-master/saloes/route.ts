import { NextResponse } from "next/server";
import {
  AdminMasterSalaoUseCaseError,
  listarAdminMasterSaloesUseCase,
} from "@/core/use-cases/admin-master/saloes";
import { createAdminMasterSalaoService } from "@/services/adminMasterSalaoService";

export async function GET() {
  try {
    const result = await listarAdminMasterSaloesUseCase({
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

    const message = error instanceof Error ? error.message : "Erro ao listar saloes.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

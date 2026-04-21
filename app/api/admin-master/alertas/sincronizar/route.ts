import { NextResponse } from "next/server";
import {
  AdminMasterAlertaUseCaseError,
  sincronizarAdminMasterAlertasUseCase,
} from "@/core/use-cases/admin-master/alertas";
import { createAdminMasterAlertaService } from "@/services/adminMasterAlertaService";

export async function POST() {
  try {
    const result = await sincronizarAdminMasterAlertasUseCase({
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
        : "Nao foi possivel sincronizar alertas.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

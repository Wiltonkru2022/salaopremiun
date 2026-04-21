import { NextResponse } from "next/server";
import {
  AdminMasterDashboardUseCaseError,
  carregarAdminMasterDashboardUseCase,
} from "@/core/use-cases/admin-master/dashboard";
import { createAdminMasterDashboardService } from "@/services/adminMasterDashboardService";

export async function GET() {
  try {
    const result = await carregarAdminMasterDashboardUseCase({
      service: createAdminMasterDashboardService(),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    if (error instanceof AdminMasterDashboardUseCaseError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Erro ao carregar dashboard.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import type { AdminMasterDashboardService } from "@/services/adminMasterDashboardService";

export class AdminMasterDashboardUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterDashboardUseCaseError";
  }
}

export async function carregarAdminMasterDashboardUseCase(params: {
  service: AdminMasterDashboardService;
}) {
  try {
    const admin = await params.service.getAccess("dashboard_ver");

    if (!admin.ok) {
      throw new AdminMasterDashboardUseCaseError(admin.message, admin.status);
    }

    const data = await params.service.carregarDashboard();

    return {
      status: 200,
      body: {
        ok: true,
        data,
      },
    };
  } catch (error) {
    if (error instanceof AdminMasterDashboardUseCaseError) {
      throw error;
    }

    throw new AdminMasterDashboardUseCaseError(
      error instanceof Error ? error.message : "Erro ao carregar dashboard.",
      500
    );
  }
}

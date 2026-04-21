import type { AdminMasterSearchService } from "@/services/adminMasterSearchService";

export class AdminMasterSearchUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterSearchUseCaseError";
  }
}

function cleanQuery(value: string) {
  return value.replace(/[%(),]/g, " ").trim();
}

export async function buscarAdminMasterUseCase(params: {
  rawQuery: string;
  service: AdminMasterSearchService;
}) {
  try {
    const admin = await params.service.getAccess("dashboard_ver");

    if (!admin.ok) {
      throw new AdminMasterSearchUseCaseError(admin.message, admin.status);
    }

    const query = cleanQuery(params.rawQuery);

    if (query.length < 2) {
      return {
        status: 200,
        body: {
          ok: true,
          results: [],
        },
      };
    }

    const results = await params.service.buscar(query);

    return {
      status: 200,
      body: {
        ok: true,
        results,
      },
    };
  } catch (error) {
    if (error instanceof AdminMasterSearchUseCaseError) {
      throw error;
    }

    throw new AdminMasterSearchUseCaseError(
      error instanceof Error ? error.message : "Erro ao buscar no AdminMaster.",
      500
    );
  }
}

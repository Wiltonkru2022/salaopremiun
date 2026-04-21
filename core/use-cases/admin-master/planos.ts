import type { AdminMasterPlanoService } from "@/services/adminMasterPlanoService";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";

export class AdminMasterPlanoUseCaseError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AdminMasterPlanoUseCaseError";
  }
}

async function requireAccess(
  service: AdminMasterPlanoService,
  permission: AdminMasterPermissionKey
) {
  const admin = await service.getAccess(permission);

  if (!admin.ok) {
    throw new AdminMasterPlanoUseCaseError(admin.message, admin.status);
  }

  return admin;
}

function mapPlanoError(error: unknown, fallback: string): never {
  if (error instanceof AdminMasterPlanoUseCaseError) {
    throw error;
  }

  throw new AdminMasterPlanoUseCaseError(
    error instanceof Error ? error.message : fallback,
    500
  );
}

export async function listarAdminMasterPlanosUseCase(params: {
  service: AdminMasterPlanoService;
}) {
  try {
    await requireAccess(params.service, "produto_ver");
    const data = await params.service.listarPlanos();

    return {
      status: 200,
      body: {
        ok: true,
        data,
      },
    };
  } catch (error) {
    mapPlanoError(error, "Erro ao listar planos.");
  }
}

export async function listarAdminMasterRecursosUseCase(params: {
  service: AdminMasterPlanoService;
}) {
  try {
    await requireAccess(params.service, "produto_ver");
    const data = await params.service.listarRecursos();

    return {
      status: 200,
      body: {
        ok: true,
        data,
      },
    };
  } catch (error) {
    mapPlanoError(error, "Erro ao listar recursos.");
  }
}

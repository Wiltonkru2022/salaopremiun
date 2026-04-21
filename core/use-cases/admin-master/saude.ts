import type { AdminMasterSaudeService } from "@/services/adminMasterSaudeService";

export class AdminMasterSaudeUseCaseError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string,
    public required?: string[]
  ) {
    super(message);
    this.name = "AdminMasterSaudeUseCaseError";
  }
}

async function requireAccess(service: AdminMasterSaudeService) {
  const admin = await service.getAccess("dashboard_ver");

  if (!admin.ok) {
    throw new AdminMasterSaudeUseCaseError(admin.message, admin.status);
  }

  return admin;
}

export async function validarAdminMasterRpcsUseCase(params: {
  service: AdminMasterSaudeService;
}) {
  const required = params.service.getRequiredDatabaseFunctions();

  try {
    await requireAccess(params.service);

    const rows = await params.service.validarFuncoesObrigatorias(required);
    const found = new Set(
      rows.filter((row) => row.exists).map((row) => row.function_name)
    );
    const missing = required.filter((name) => !found.has(name));

    return {
      status: 200,
      body: {
        ok: missing.length === 0,
        totalRequired: required.length,
        missing,
        found: [...found].sort(),
      },
    };
  } catch (error) {
    if (error instanceof AdminMasterSaudeUseCaseError) {
      throw error;
    }

    throw new AdminMasterSaudeUseCaseError(
      "Nao foi possivel validar funcoes obrigatorias. Aplique a migration fn_validar_funcoes_obrigatorias antes do deploy.",
      500,
      error instanceof Error ? error.message : undefined,
      required
    );
  }
}

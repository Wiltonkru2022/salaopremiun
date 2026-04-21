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
  const requiredTables = params.service.getRequiredDatabaseTables();

  try {
    await requireAccess(params.service);

    const [rows, tableRows] = await Promise.all([
      params.service.validarFuncoesObrigatorias(required),
      params.service.validarTabelasObrigatorias(requiredTables),
    ]);

    const found = new Set(
      rows.filter((row) => row.exists).map((row) => row.function_name)
    );
    const missing = required.filter((name) => !found.has(name));
    const foundTables = new Set(
      tableRows.filter((row) => row.exists).map((row) => row.table_name)
    );
    const missingTables = requiredTables.filter((name) => !foundTables.has(name));

    return {
      status: 200,
      body: {
        ok: missing.length === 0 && missingTables.length === 0,
        totalRequired: required.length,
        totalRequiredTables: requiredTables.length,
        missing,
        found: [...found].sort(),
        missingTables,
        foundTables: [...foundTables].sort(),
        tableErrors: tableRows
          .filter((row) => !row.exists && row.error)
          .map((row) => ({
            table: row.table_name,
            error: row.error,
          })),
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

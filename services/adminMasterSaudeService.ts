import {
  getAdminMasterAccess,
  type AdminMasterAccessResult,
} from "@/lib/admin-master/auth/requireAdminMasterUser";
import type { AdminMasterPermissionKey } from "@/lib/admin-master/auth/adminMasterPermissions";
import { REQUIRED_DATABASE_FUNCTIONS } from "@/lib/db/required-rpcs";
import { REQUIRED_DATABASE_TABLES } from "@/lib/db/required-tables";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

type RoutineRow = {
  function_name: string;
  function_exists: boolean;
};

type RoutineValidationRow = {
  function_name: string;
  exists: boolean;
};

type TableValidationRow = {
  table_name: string;
  exists: boolean;
  error?: string | null;
};

export function createAdminMasterSaudeService() {
  return {
    getAccess(
      permission: AdminMasterPermissionKey
    ): Promise<AdminMasterAccessResult> {
      return getAdminMasterAccess(permission);
    },

    getRequiredDatabaseFunctions() {
      return [...REQUIRED_DATABASE_FUNCTIONS];
    },

    getRequiredDatabaseTables() {
      return [...REQUIRED_DATABASE_TABLES];
    },

    async validarFuncoesObrigatorias(functionNames: readonly string[]) {
      return runAdminOperation({
        action: "admin_master_saude_validar_funcoes_obrigatorias",
        run: async (supabaseAdmin) => {
          const { data, error } = await supabaseAdmin.rpc(
            "fn_validar_funcoes_obrigatorias",
            {
              p_function_names: [...functionNames],
            }
          );

          if (error) {
            throw new Error(
              error.message || "Erro ao validar RPCs obrigatorias."
            );
          }

          return ((data || []) as RoutineRow[])
            .filter((row) => typeof row.function_name === "string")
            .map(
              (row) =>
                ({
                  function_name: row.function_name,
                  exists: Boolean(row.function_exists),
                }) satisfies RoutineValidationRow
            );
        },
      });
    },

    async validarTabelasObrigatorias(tableNames: readonly string[]) {
      return runAdminOperation({
        action: "admin_master_saude_validar_tabelas_obrigatorias",
        run: async (supabaseAdmin) => {
          const adminQueryClient = supabaseAdmin as unknown as {
            from(table: string): {
              select(
                columns: string,
                options: { count: "exact"; head: true }
              ): Promise<{ error: { message?: string } | null }>;
            };
          };

          const rows = await Promise.all(
            tableNames.map(async (tableName) => {
              const { error } = await adminQueryClient
                .from(tableName)
                .select("id", { count: "exact", head: true });

              return {
                table_name: tableName,
                exists: !error,
                error: error?.message || null,
              } satisfies TableValidationRow;
            })
          );

          return rows;
        },
      });
    },
  };
}

export type AdminMasterSaudeService = ReturnType<
  typeof createAdminMasterSaudeService
>;

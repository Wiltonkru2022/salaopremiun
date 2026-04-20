import { NextResponse } from "next/server";
import { requireAdminMasterUser } from "@/lib/admin-master/auth/requireAdminMasterUser";
import { REQUIRED_DATABASE_FUNCTIONS } from "@/lib/db/required-rpcs";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type RoutineRow = {
  function_name: string;
  exists: boolean;
};

export async function GET() {
  try {
    await requireAdminMasterUser();

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc(
      "fn_validar_funcoes_obrigatorias",
      {
        p_function_names: [...REQUIRED_DATABASE_FUNCTIONS],
      }
    );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Não foi possível validar funções obrigatórias. Aplique a migration fn_validar_funcoes_obrigatorias antes do deploy.",
          details: error.message,
          required: REQUIRED_DATABASE_FUNCTIONS,
        },
        { status: 500 }
      );
    }

    const found = new Set(
      ((data || []) as RoutineRow[])
        .filter((row) => row.exists)
        .map((row) => row.function_name)
    );
    const missing = REQUIRED_DATABASE_FUNCTIONS.filter((name) => !found.has(name));

    return NextResponse.json({
      ok: missing.length === 0,
      totalRequired: REQUIRED_DATABASE_FUNCTIONS.length,
      missing,
      found: [...found].sort(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao validar RPCs.",
      },
      { status: 500 }
    );
  }
}

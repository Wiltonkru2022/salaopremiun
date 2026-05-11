import { NextResponse } from "next/server";
import {
  AuthzError,
  requireSalaoPermission,
} from "@/lib/auth/require-salao-permission";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ExcluirSalaoPayload = {
  confirmacao?: string;
  motivo?: string;
};

type SupabaseRpcError = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type PainelAuthUserRow = {
  auth_user_id?: string | null;
  email?: string | null;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as ExcluirSalaoPayload;
    const confirmacao = String(payload.confirmacao || "").trim();

    if (confirmacao !== "EXCLUIR") {
      return NextResponse.json(
        {
          ok: false,
          error: "Digite EXCLUIR para confirmar a exclusao definitiva.",
        },
        { status: 400 }
      );
    }

    const { usuario } = await getPainelUserContext();

    if (!usuario?.id_salao) {
      throw new AuthzError("Salao nao identificado para exclusao.", 401);
    }

    const membership = await requireSalaoPermission(
      usuario.id_salao,
      "perfil_salao_editar",
      { allowedNiveis: ["admin"] }
    );

    const supabaseAdmin = getSupabaseAdmin();
    const { data: painelAuthUsers, error: painelAuthUsersError } =
      await supabaseAdmin
        .from("usuarios")
        .select("auth_user_id, email")
        .eq("id_salao", membership.usuario.id_salao)
        .not("auth_user_id", "is", null);

    if (painelAuthUsersError) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Nao foi possivel preparar a exclusao dos usuarios de autenticacao.",
          debug: {
            message: painelAuthUsersError.message,
            code: painelAuthUsersError.code,
          },
        },
        { status: 500 }
      );
    }

    const authUsersToDelete = Array.from(
      new Set(
        ((painelAuthUsers || []) as PainelAuthUserRow[])
          .map((row) => String(row.auth_user_id || "").trim())
          .filter(Boolean)
      )
    );

    const { data, error } = await (supabaseAdmin as any).rpc(
      "excluir_salao_definitivo",
      {
        p_id_salao: membership.usuario.id_salao,
        p_actor_usuario_id: membership.usuario.id,
        p_motivo: String(payload.motivo || "").trim() || null,
        p_origem: "perfil_salao",
      }
    );

    if (error) {
      const rpcError = error as SupabaseRpcError;
      const debugId = crypto.randomUUID();
      console.error("Erro ao excluir salao definitivamente:", {
        debugId,
        idSalao: membership.usuario.id_salao,
        idUsuario: membership.usuario.id,
        code: rpcError.code,
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            "Nao foi possivel excluir o salao agora. Nenhum dado foi removido; tente novamente ou fale com o suporte.",
          debugId,
          debug: {
            code: rpcError.code || null,
            message: rpcError.message || "Erro sem mensagem do Supabase.",
            details: rpcError.details || null,
            hint: rpcError.hint || null,
          },
        },
        { status: 500 }
      );
    }

    const authDeleteResults = await Promise.all(
      authUsersToDelete.map(async (authUserId) => {
        const result = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        return {
          authUserId,
          ok: !result.error,
          error: result.error?.message || null,
        };
      })
    );

    const authDeleteErrors = authDeleteResults.filter((item) => !item.ok);

    if (authDeleteErrors.length) {
      console.error("Salao excluido, mas alguns usuarios Auth nao foram apagados:", {
        idSalao: membership.usuario.id_salao,
        authDeleteErrors,
      });
    }

    return NextResponse.json({
      ok: true,
      resultado: data,
      authUsuariosApagados: authDeleteResults.filter((item) => item.ok).length,
      authUsuariosComErro: authDeleteErrors,
    });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    const debugId = crypto.randomUUID();
    console.error("Falha inesperada ao excluir salao:", {
      debugId,
      error,
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Erro inesperado ao excluir o salao.",
        debugId,
        debug: {
          message:
            error instanceof Error ? error.message : "Erro sem mensagem.",
        },
      },
      { status: 500 }
    );
  }
}

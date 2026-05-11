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
      console.error("Erro ao excluir salao definitivamente:", error);
      return NextResponse.json(
        {
          ok: false,
          error:
            "Nao foi possivel excluir o salao agora. Nenhum dado foi removido; tente novamente ou fale com o suporte.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, resultado: data });
  } catch (error) {
    if (error instanceof AuthzError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }

    console.error("Falha inesperada ao excluir salao:", error);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao excluir o salao." },
      { status: 500 }
    );
  }
}

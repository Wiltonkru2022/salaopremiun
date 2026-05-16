import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import {
  carregarPainelDashboardResumo,
  normalizeDashboardPeriodo,
} from "@/services/painelDashboardResumoService";

export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { user, usuario } = await getPainelUserContext();

  if (!user) {
    return jsonError("Sessao expirada.", 401);
  }

  if (!usuario?.id_salao) {
    return jsonError("Nao foi possivel identificar o salao do usuario.", 403);
  }

  if (usuario.status !== "ativo") {
    return jsonError("Usuario inativo.", 403);
  }

  try {
    const url = new URL(request.url);
    const periodo = normalizeDashboardPeriodo(url.searchParams.get("periodo"));
    const resumo = await carregarPainelDashboardResumo(usuario.id_salao, new Date(), periodo);

    return NextResponse.json({
      usuario: {
        id: usuario.id,
        id_salao: usuario.id_salao,
        nivel: usuario.nivel,
        status: usuario.status,
      },
      resumo,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Erro ao carregar dashboard.",
      500
    );
  }
}

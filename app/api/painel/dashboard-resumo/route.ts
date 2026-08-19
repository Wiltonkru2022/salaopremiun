import { NextResponse } from "next/server";
import { getPainelUserContext } from "@/lib/auth/get-painel-user-context";
import { requireSalaoPermission } from "@/lib/auth/require-salao-permission";
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

  if (!user) return jsonError("Sessão expirada.", 401);
  if (!usuario?.id_salao) {
    return jsonError("Não foi possível identificar o salão do usuário.", 403);
  }
  if (usuario.status !== "ativo") return jsonError("Usuário inativo.", 403);

  try {
    await requireSalaoPermission(usuario.id_salao, "dashboard_ver");
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
    const status =
      typeof error === "object" && error && "status" in error
        ? Number((error as { status?: unknown }).status || 500)
        : 500;
    return jsonError(
      error instanceof Error ? error.message : "Erro ao carregar dashboard.",
      status >= 400 && status < 600 ? status : 500
    );
  }
}

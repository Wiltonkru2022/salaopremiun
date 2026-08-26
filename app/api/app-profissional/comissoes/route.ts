import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/db/admin-ops";

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(request: Request) {
  try {
    const session = await requireProfissionalAppContext();
    const url = new URL(request.url);
    const now = new Date();
    const fallbackStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      .toISOString()
      .slice(0, 10);
    const fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      .toISOString()
      .slice(0, 10);
    const startParam = String(url.searchParams.get("start") || "");
    const endParam = String(url.searchParams.get("end") || "");
    const start = validDate(startParam) ? startParam : fallbackStart;
    const end = validDate(endParam) ? endParam : fallbackEnd;

    const payload = await runAdminOperation({
      action: "app_profissional_pwa_comissoes",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (database) => {
        let query = (database as any)
          .from("comissoes_lancamentos")
          .select("id, id_profissional, descricao, valor_base, valor_comissao, percentual, percentual_aplicado, status, competencia, competencia_data, pago_em, criado_em")
          .eq("id_salao", session.idSalao)
          .gte("competencia_data", start)
          .lte("competencia_data", end)
          .order("competencia_data", { ascending: false })
          .limit(1000);

        if (!session.podeVerAgendaTodos) {
          query = query.eq("id_profissional", session.idProfissional);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return {
          comissoes: (data || []).map((item: any) => ({
            id: item.id,
            descricao: item.descricao || "Comissão",
            competenciaData: item.competencia_data || item.competencia || null,
            valorBase: Number(item.valor_base || 0),
            valor: Number(item.valor_comissao || 0),
            percentualAplicado: Number(item.percentual_aplicado ?? item.percentual ?? 0),
            status: item.status || "pendente",
            pagoEm: item.pago_em || null,
          })),
        };
      },
    });

    return NextResponse.json(
      { ok: true, ...payload },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar as comissões." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }
}

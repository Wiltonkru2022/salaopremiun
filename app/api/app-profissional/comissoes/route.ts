import { NextResponse } from "next/server";
import { requireProfissionalAppContext } from "@/lib/profissional-context.server";
import { runAdminOperation } from "@/lib/supabase/admin-ops";

export async function GET() {
  try {
    const session = await requireProfissionalAppContext();
    const payload = await runAdminOperation({
      action: "app_profissional_comissoes_listar",
      actorId: session.idProfissional,
      idSalao: session.idSalao,
      run: async (supabase) => {
        const { data, error } = await (supabase as any)
          .from("comissoes_lancamentos")
          .select("id, descricao, competencia, competencia_data, valor_base, valor_comissao, percentual, percentual_aplicado, status, pago_em, criado_em")
          .eq("id_salao", session.idSalao)
          .eq("id_profissional", session.idProfissional)
          .order("competencia_data", { ascending: false, nullsFirst: false })
          .order("criado_em", { ascending: false })
          .limit(500);

        if (error) throw new Error(error.message);

        return {
          comissoes: (data || []).map((row: any) => ({
            id: String(row.id),
            descricao: String(row.descricao || "Comissão"),
            competenciaData: row.competencia_data || row.competencia || null,
            valorBase: Number(row.valor_base || 0),
            valor: Number(row.valor_comissao || 0),
            percentualAplicado: Number(row.percentual_aplicado ?? row.percentual ?? 0),
            status: String(row.status || "pendente").toLowerCase(),
            pagoEm: row.pago_em || null,
          })),
        };
      },
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Não foi possível carregar as comissões." },
      { status: 400 }
    );
  }
}
